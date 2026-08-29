import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { PageHeader, Card, EmptyState } from "@/components/dashboard/ui";
import { TemperatureBadge, LeadStatusBadge, ScoreBar, ChannelBadge } from "@/components/badges";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "hot", label: "🔥 Hot" },
  { key: "warm", label: "Warm" },
  { key: "cold", label: "Cold" },
  { key: "qualified", label: "Qualified" },
  { key: "new", label: "New" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

function whereForFilter(orgId: string, filter: string, search: string): Prisma.LeadWhereInput {
  const base: Prisma.LeadWhereInput = { organizationId: orgId };
  if (search) {
    base.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { interest: { contains: search } },
      { location: { contains: search } },
    ];
  }
  switch (filter) {
    case "hot":
      return { ...base, temperature: "HOT" };
    case "warm":
      return { ...base, temperature: "WARM" };
    case "cold":
      return { ...base, temperature: "COLD" };
    case "qualified":
      return { ...base, qualified: true };
    case "new":
      return { ...base, status: "NEW" };
    case "won":
      return { ...base, status: "WON" };
    case "lost":
      return { ...base, status: "LOST" };
    default:
      return base;
  }
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const search = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 25;

  const where = whereForFilter(ctx.org.id, filter, search);
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      include: { assignedTo: { select: { name: true } } },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.lead.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const qs = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (search) params.set("q", search);
    for (const [k, v] of Object.entries(patch)) v ? params.set(k, v) : params.delete(k);
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div>
      <PageHeader title="Leads" subtitle={`${total} lead${total === 1 ? "" : "s"} — qualified and scored by Velrix.`} />

      {/* Filter chips + search */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/dashboard/leads${f.key === "all" ? (search ? `?q=${encodeURIComponent(search)}` : "") : `?filter=${f.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}`}
              className="badge"
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                background: filter === f.key ? "var(--accent-soft)" : undefined,
                color: filter === f.key ? "var(--fg)" : undefined,
                borderColor: filter === f.key ? "rgba(34,211,238,0.3)" : undefined,
              }}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form action="/dashboard/leads" method="get" style={{ display: "flex", gap: 6 }}>
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <input className="input" name="q" defaultValue={search} placeholder="Search name, phone, interest…" style={{ width: 240, height: 34 }} />
        </form>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon="🧲"
          title={search || filter !== "all" ? "No matching leads" : "No leads yet"}
          body={
            search || filter !== "all"
              ? "Try a different filter or search term."
              : "Publish the website widget or test the agent to start capturing qualified leads."
          }
          cta={search || filter !== "all" ? undefined : { href: "/dashboard/channels", label: "Set up a channel" }}
        />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 860 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--fg-muted)", fontSize: 12.5, background: "rgba(255,255,255,0.02)" }}>
                  {["Name", "Score", "Status", "Source", "Interest", "Budget", "Timeline", "Assigned", "Activity"].map((h) => (
                    <th key={h} style={{ padding: "11px 12px", fontWeight: 550, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} style={{ borderTop: "1px solid var(--border)" }} className="lead-row">
                    <td style={{ padding: "11px 12px" }}>
                      <Link href={`/dashboard/leads/${lead.id}`} style={{ fontWeight: 600 }}>
                        {lead.name ?? "Unknown visitor"}
                      </Link>
                      {lead.phone && <div className="muted" style={{ fontSize: 12 }}>{lead.phone}</div>}
                    </td>
                    <td style={{ padding: "11px 12px", width: 130 }}><ScoreBar score={lead.score} temperature={lead.temperature} /></td>
                    <td style={{ padding: "11px 12px" }}><LeadStatusBadge status={lead.status} /></td>
                    <td style={{ padding: "11px 12px" }}><ChannelBadge type={lead.source} /></td>
                    <td style={{ padding: "11px 12px" }} className="muted">{lead.interest ?? "—"}</td>
                    <td style={{ padding: "11px 12px" }} className="muted">{lead.budget ?? "—"}</td>
                    <td style={{ padding: "11px 12px" }} className="muted">{lead.timeline ?? "—"}</td>
                    <td style={{ padding: "11px 12px" }} className="muted">{lead.assignedTo?.name ?? "—"}</td>
                    <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }} className="muted">{timeAgo(lead.lastContactAt ?? lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18, alignItems: "center" }}>
          {page > 1 && <Link href={`/dashboard/leads${qs({ page: String(page - 1) })}`} className="btn btn-sm">← Prev</Link>}
          <span className="muted" style={{ fontSize: 13 }}>Page {page} of {pages}</span>
          {page < pages && <Link href={`/dashboard/leads${qs({ page: String(page + 1) })}`} className="btn btn-sm">Next →</Link>}
        </div>
      )}

      <style>{`.lead-row:hover{ background: rgba(255,255,255,0.02); }`}</style>
    </div>
  );
}
