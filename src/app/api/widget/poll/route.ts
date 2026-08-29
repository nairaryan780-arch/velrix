import { corsJson, corsPreflight, corsError, resolveWidgetChannel } from "@/lib/widget";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsPreflight();
}

// Lets the widget receive human/agent replies that arrive after the customer's
// last message (e.g. during human takeover). Returns non-customer messages
// created after `since`.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const publicKey = url.searchParams.get("publicKey") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const since = url.searchParams.get("since");
    if (!publicKey || !token) return corsJson({ error: { code: "bad_request", message: "Missing params" } }, 400);

    const { org } = await resolveWidgetChannel(publicKey);
    const convo = await prisma.conversation.findFirst({
      where: { organizationId: org.id, channelType: "WEBSITE", externalThreadId: token },
      select: { id: true, status: true },
    });
    if (!convo) return corsJson({ error: { code: "not_found", message: "Conversation not found" } }, 404);

    const messages = await prisma.message.findMany({
      where: {
        conversationId: convo.id,
        author: { in: ["AGENT", "HUMAN"] },
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    return corsJson({
      status: convo.status,
      humanActive: convo.status === "HUMAN_TAKEOVER",
      messages: messages.map((m) => ({ id: m.id, author: m.author, body: m.body, createdAt: m.createdAt.toISOString() })),
    });
  } catch (err) {
    return corsError(err, "widget.poll");
  }
}
