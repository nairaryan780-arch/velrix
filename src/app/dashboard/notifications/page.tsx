import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/dashboard/ui";
import { MarkAllRead } from "@/components/dashboard/mark-read";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const ICONS: Record<string, string> = {
  HOT_LEAD: "🔥",
  HANDOFF: "🤝",
  AGENT_ERROR: "⚠️",
  INTEGRATION_FAILURE: "🔌",
  FOLLOWUP_ATTENTION: "⏰",
};

export default async function NotificationsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { organizationId: ctx.org.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Hot leads, handoffs and system alerts." action={<MarkAllRead hasUnread={hasUnread} />} />

      {notifications.length === 0 ? (
        <EmptyState icon="🔔" title="You're all caught up" body="Notifications about hot leads and handoffs will appear here." />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {notifications.map((n) => {
            const leadId = (n.dataJson as { leadId?: string } | null)?.leadId;
            const inner = (
              <div className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start", borderLeft: n.readAt ? undefined : "2px solid var(--accent)" }}>
                <span style={{ fontSize: 20 }}>{ICONS[n.kind] ?? "🔔"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{n.body}</div>
                </div>
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{timeAgo(n.createdAt)}</span>
              </div>
            );
            return leadId ? (
              <Link key={n.id} href={`/dashboard/leads/${leadId}`}>{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
