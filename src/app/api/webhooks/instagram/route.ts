import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { getInstagramConfig, parseInstagramInbound } from "@/lib/channels/instagram";
import { verifyMetaSignature } from "@/lib/channels/whatsapp";
import { startEnquiry } from "@/lib/agent/engine";
import { ChannelType } from "@/lib/constants";

export const runtime = "nodejs";

// Instagram Messaging webhook. REQUIRES EXTERNAL CREDENTIALS.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === env.instagramVerifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const recipientId = extractRecipientId(payload);
  const channels = await prisma.channel.findMany({ where: { type: "INSTAGRAM", status: "CONNECTED" } });
  const match = channels.find((c) => (c.configJson as { pageId?: string } | null)?.pageId === recipientId) ?? channels[0];
  if (!match) return Response.json({ ok: true });

  const cfg = await getInstagramConfig(match.organizationId);
  if (cfg?.appSecret) {
    if (!verifyMetaSignature(cfg.appSecret, raw, req.headers.get("x-hub-signature-256"))) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  for (const msg of parseInstagramInbound(payload)) {
    try {
      await startEnquiry({
        organizationId: match.organizationId,
        channelType: ChannelType.INSTAGRAM,
        channelId: match.id,
        externalThreadId: msg.from,
        openingText: msg.text,
      });
    } catch (err) {
      log.error("instagram.process_failed", { organizationId: match.organizationId, error: err instanceof Error ? err.message : "unknown" });
    }
  }
  return Response.json({ ok: true });
}

function extractRecipientId(payload: unknown): string | undefined {
  const entry = (payload as { entry?: { messaging?: { recipient?: { id?: string } }[] }[] })?.entry ?? [];
  return entry[0]?.messaging?.[0]?.recipient?.id;
}
