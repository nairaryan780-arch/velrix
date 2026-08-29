import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { can } from "@/lib/auth/rbac";
import { LeadWorkspace } from "@/components/dashboard/lead-workspace";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        include: { messages: { orderBy: { createdAt: "asc" }, take: 200 }, assignedTo: { select: { id: true, name: true } } },
      },
    },
  });
  if (!lead) notFound();

  const convo = lead.conversations[0];
  const members = await prisma.membership.findMany({
    where: { organizationId: ctx.org.id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const initial = convo
    ? {
        id: convo.id,
        status: convo.status,
        summary: convo.summary,
        optOut: convo.optOut,
        assignedTo: convo.assignedTo,
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          score: lead.score,
          temperature: lead.temperature,
          status: lead.status,
          interest: lead.interest,
          budget: lead.budget,
          timeline: lead.timeline,
          location: lead.location,
          intent: lead.intent,
          qualified: lead.qualified,
          scoreReasons: (lead.scoreReasonsJson as string[] | null) ?? [],
          requirements: (lead.requirementsJson as Record<string, string> | null) ?? {},
        },
        messages: convo.messages.map((m) => ({ id: m.id, author: m.author, body: m.body, createdAt: m.createdAt.toISOString(), meta: m.metaJson })),
      }
    : null;

  return (
    <div>
      <Link href="/dashboard/leads" className="muted" style={{ fontSize: 13 }}>
        ← Back to leads
      </Link>
      <div style={{ marginTop: 12 }}>
        {initial ? (
          <LeadWorkspace initial={initial} members={members.map((m) => ({ id: m.user.id, name: m.user.name }))} canWrite={can(ctx.role, "conversations:write")} />
        ) : (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <p className="muted">This lead has no conversation yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
