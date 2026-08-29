import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { analyticsSummary, analyticsSeries } from "@/lib/analytics";
import { PageHeader, StatCard, Card, SectionTitle } from "@/components/dashboard/ui";
import { TemperatureBadge, ScoreBar } from "@/components/badges";
import { timeAgo, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.org.id;

  const [summary, series, hotLeads, recentLeads, openConvos, handoffs, scheduledFollowUps, totalLeads] = await Promise.all([
    analyticsSummary(orgId, 30),
    analyticsSeries(orgId, 14),
    prisma.lead.findMany({
      where: { organizationId: orgId, temperature: "HOT", status: { notIn: ["WON", "LOST", "OPTED_OUT"] } },
      orderBy: { score: "desc" },
      take: 5,
    }),
    prisma.lead.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.conversation.count({ where: { organizationId: orgId, status: { in: ["AI_ACTIVE", "OPEN"] } } }),
    prisma.conversation.count({ where: { organizationId: orgId, status: "HUMAN_TAKEOVER" } }),
    prisma.followUpJob.count({ where: { conversation: { organizationId: orgId }, status: "scheduled" } }),
    prisma.lead.count({ where: { organizationId: orgId } }),
  ]);

  const maxSeries = Math.max(1, ...series.map((s) => s.enquiries));

  return (
    <div>
      <PageHeader
        title="Mission control"
        subtitle="Every enquiry, qualified and scored in real time."
        action={
          <Link href="/dashboard/agent" className="btn btn-sm">
            Test the agent
          </Link>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        <StatCard label="New enquiries" value={summary.enquiries} hint="last 30 days" tone="accent" />
        <StatCard label="Hot leads" value={hotLeads.length} hint="need attention now" tone="hot" />
        <StatCard label="Qualified" value={summary.qualified} hint={`${pct(summary.qualificationRate)} of enquiries`} tone="good" />
        <StatCard label="Follow-ups" value={scheduledFollowUps} hint="scheduled" tone="warm" />
        <StatCard label="Handoffs" value={handoffs} hint="with your team" tone="cold" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginTop: 16 }} className="ov-grid">
        {/* Hot leads */}
        <Card>
          <SectionTitle action={<Link href="/dashboard/leads?filter=hot" className="muted" style={{ fontSize: 13 }}>View all →</Link>}>
            🔥 Hot leads
          </SectionTitle>
          {hotLeads.length === 0 ? (
            <p className="muted" style={{ fontSize: 14, padding: "18px 0" }}>
              No hot leads yet. When Velrix qualifies a high-intent buyer, they&apos;ll appear here for immediate follow-up.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {hotLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="glass"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 10 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{lead.name ?? "Unknown visitor"}</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {[lead.interest, lead.location, lead.budget, lead.timeline].filter(Boolean).join(" · ") || "New enquiry"}
                    </div>
                  </div>
                  <div style={{ width: 92 }}>
                    <ScoreBar score={lead.score} temperature={lead.temperature} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Performance */}
        <Card>
          <SectionTitle>Performance</SectionTitle>
          <div style={{ display: "grid", gap: 14 }}>
            <Metric label="Avg. response time" value={summary.avgResponseMs != null ? `${(summary.avgResponseMs / 1000).toFixed(1)}s` : "—"} />
            <Metric label="Qualification rate" value={pct(summary.qualificationRate)} />
            <Metric label="Total leads" value={String(totalLeads)} />
            <Metric label="Active conversations" value={String(openConvos)} />
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Enquiries · last 14 days</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 56 }}>
              {series.map((s) => (
                <div key={s.day} title={`${s.day}: ${s.enquiries} enquiries`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ height: `${(s.enquiries / maxSeries) * 100}%`, minHeight: 2, background: "linear-gradient(180deg,var(--accent),var(--accent-2))", borderRadius: 3, opacity: 0.85 }} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent leads */}
      <div style={{ marginTop: 16 }}>
        <Card>
          <SectionTitle action={<Link href="/dashboard/leads" className="muted" style={{ fontSize: 13 }}>All leads →</Link>}>
            Recent leads
          </SectionTitle>
          {recentLeads.length === 0 ? (
            <p className="muted" style={{ fontSize: 14, padding: "18px 0" }}>
              No leads yet. Add the website widget from <Link href="/dashboard/channels" style={{ color: "var(--accent)" }}>Channels</Link> or test the agent to see the flow.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--fg-muted)", fontSize: 12.5 }}>
                    <th style={{ padding: "6px 8px", fontWeight: 550 }}>Name</th>
                    <th style={{ padding: "6px 8px", fontWeight: 550 }}>Interest</th>
                    <th style={{ padding: "6px 8px", fontWeight: 550 }}>Score</th>
                    <th style={{ padding: "6px 8px", fontWeight: 550 }}>Status</th>
                    <th style={{ padding: "6px 8px", fontWeight: 550, textAlign: "right" }}>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 8px" }}>
                        <Link href={`/dashboard/leads/${lead.id}`} style={{ fontWeight: 550 }}>{lead.name ?? "Unknown"}</Link>
                      </td>
                      <td style={{ padding: "10px 8px" }} className="muted">{lead.interest ?? "—"}</td>
                      <td style={{ padding: "10px 8px", width: 120 }}><ScoreBar score={lead.score} temperature={lead.temperature} /></td>
                      <td style={{ padding: "10px 8px" }}><TemperatureBadge temperature={lead.temperature} /></td>
                      <td style={{ padding: "10px 8px", textAlign: "right" }} className="muted">{timeAgo(lead.lastContactAt ?? lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <style>{`@media (max-width: 900px){ .ov-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className="muted" style={{ fontSize: 13.5 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 15 }}>{value}</span>
    </div>
  );
}
