import { ChannelType } from "@/lib/constants";
import { corsJson, corsPreflight, corsError, resolveWidgetChannel } from "@/lib/widget";
import { widgetStartSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { randomToken } from "@/lib/crypto";
import { startEnquiry } from "@/lib/agent/engine";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  try {
    const parsed = widgetStartSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return corsJson({ error: { code: "bad_request", message: "Invalid request" } }, 400);
    const { publicKey, message, visitorName } = parsed.data;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = rateLimit(`widget:start:${publicKey}:${ip}`, 20, 60_000);
    if (!rl.allowed) return corsJson({ error: { code: "rate_limited", message: "Too many requests" } }, 429);

    const { channel, org } = await resolveWidgetChannel(publicKey);
    const token = randomToken(16);

    const result = await startEnquiry({
      organizationId: org.id,
      channelType: ChannelType.WEBSITE,
      channelId: channel.id,
      externalThreadId: token,
      openingText: message,
      visitorName,
    });

    return corsJson({
      conversationToken: token,
      reply: "reply" in result ? result.reply : null,
      stopped: result.stopped ?? false,
    });
  } catch (err) {
    return corsError(err, "widget.start");
  }
}
