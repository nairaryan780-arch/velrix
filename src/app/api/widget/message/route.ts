import { corsJson, corsPreflight, corsError, resolveWidgetChannel } from "@/lib/widget";
import { widgetMessageSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/db";
import { runAgentTurn } from "@/lib/agent/engine";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  try {
    const parsed = widgetMessageSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return corsJson({ error: { code: "bad_request", message: "Invalid request" } }, 400);
    const { publicKey, conversationToken, message } = parsed.data;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = rateLimit(`widget:msg:${conversationToken}:${ip}`, 40, 60_000);
    if (!rl.allowed) return corsJson({ error: { code: "rate_limited", message: "Too many requests" } }, 429);

    const { org } = await resolveWidgetChannel(publicKey);
    const convo = await prisma.conversation.findFirst({
      where: { organizationId: org.id, channelType: "WEBSITE", externalThreadId: conversationToken },
    });
    if (!convo) return corsJson({ error: { code: "not_found", message: "Conversation not found" } }, 404);

    const result = await runAgentTurn({ organizationId: org.id, conversationId: convo.id, customerText: message });
    return corsJson({
      reply: "reply" in result ? result.reply : null,
      stopped: result.stopped ?? false,
      // When a human has taken over, the customer's message is stored and a person will reply.
      humanActive: result.stopped && "reason" in result && result.reason === "human_takeover",
    });
  } catch (err) {
    return corsError(err, "widget.message");
  }
}
