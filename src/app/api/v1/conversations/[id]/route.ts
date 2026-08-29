import { route, ok, notFound } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Poll endpoint: returns the conversation's messages + live status + lead intel.
export const GET = route(async (_req, rc) => {
  const ctx = await requireOrg("conversations:read");
  const { id } = (await rc.params) ?? {};
  const convo = await prisma.conversation.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      lead: true,
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  if (!convo) throw notFound("Conversation not found");

  return ok({
    id: convo.id,
    status: convo.status,
    summary: convo.summary,
    optOut: convo.optOut,
    assignedTo: convo.assignedTo,
    lead: {
      id: convo.lead.id,
      name: convo.lead.name,
      email: convo.lead.email,
      phone: convo.lead.phone,
      score: convo.lead.score,
      temperature: convo.lead.temperature,
      status: convo.lead.status,
      interest: convo.lead.interest,
      budget: convo.lead.budget,
      timeline: convo.lead.timeline,
      location: convo.lead.location,
      intent: convo.lead.intent,
      qualified: convo.lead.qualified,
      scoreReasons: (convo.lead.scoreReasonsJson as string[] | null) ?? [],
      requirements: (convo.lead.requirementsJson as Record<string, string> | null) ?? {},
    },
    messages: convo.messages.map((m) => ({ id: m.id, author: m.author, body: m.body, createdAt: m.createdAt, meta: m.metaJson })),
  });
});
