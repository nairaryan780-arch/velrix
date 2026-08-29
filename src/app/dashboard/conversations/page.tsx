import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { PageHeader, Card, EmptyState } from "@/components/dashboard/ui";
import { TemperatureBadge, ChannelBadge } from "@/components/badges";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "AI active" },
  { key: "human", label: "Human takeover" },
  { key: "closed", label: "Closed" },
];

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  const filter = (await searchParams).filter ?? "all";

  const where: Prisma.ConversationWhereInput = { organizationId: ctx.org.id };
  if (filter === "active") where.status = { in: ["AI_ACTIVE", "OPEN"] };
  else if (filter === "human") where.status = "HUMAN_TAKEOVER";
  else if (filter === "closed") where.status = { in: ["CLOSED", "DORMANT"] };

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: { lead: true, assignedTo: { select: { name: true } }, _count: { select: { messages: true } } },
  });

  return (
    <div>
      <PageHeader title="Conversations" subtitle="Every live and past conversation your agent is handling." />

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/dashboard/conversations${f.key === "all" ? "" : `?filter=${f.key}`}`} className="badge" style={{ padding: "6px 12px", background: filter === f.key ? "var(--accent-soft)" : undefined, color: filter === f.key ? "var(--fg)" : undefined }}>
            {f.label}
          </Link>
        ))}
      </div>

      {conversations.length === 0 ? (
        <EmptyState icon="💬" title="No conversations yet" body="When enquiries arrive through your channels, they'll show up here." cta={{ href: "/dashboard/channels", label: "Set up a channel" }} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {conversations.map((c) => (
            <Link key={c.id} href={`/dashboard/leads/${c.leadId}`} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.status === "HUMAN_TAKEOVER" ? "var(--good)" : c.status === "AI_ACTIVE" ? "var(--accent)" : "var(--fg-muted)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{c.lead.name ?? "Unknown visitor"}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.summary ?? [c.lead.interest, c.lead.location].filter(Boolean).join(" · ") ?? "New conversation"}
                </div>
              </div>
              <ChannelBadge type={c.channelType} />
              <TemperatureBadge temperature={c.lead.temperature} />
              <span className="muted" style={{ fontSize: 12.5, width: 64, textAlign: "right" }}>{timeAgo(c.lastMessageAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
