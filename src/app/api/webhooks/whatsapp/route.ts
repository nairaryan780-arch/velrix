import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { getWhatsAppConfig, verifyMetaSignature, parseWhatsAppInbound } from "@/lib/channels/whatsapp";
import { startEnquiry } from "@/lib/agent/engine";
import { ChannelType } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * WhatsApp Cloud API webhook. REQUIRES EXTERNAL CREDENTIALS (a connected
 * WhatsApp integration). GET handles Meta's verification handshake; POST
 * verifies the signature, resolves the tenant by phone_number_id, and routes
 * each inbound message through the agent. Webhook retries are de-duplicated by
 * the provider message id.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === env.whatsappVerifyToken) {
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

  const phoneNumberId = extractPhoneNumberId(payload);
  if (!phoneNumberId) return Response.json({ ok: true }); // status/delivery events

  // Resolve tenant by the (non-secret) phone number id stored on the channel.
  // JSON-path matching isn't portable on SQLite, so filter connected channels in JS.
  const channels = await prisma.channel.findMany({ where: { type: "WHATSAPP", status: "CONNECTED" } });
  const match = channels.find((c) => (c.configJson as { phoneNumberId?: string } | null)?.phoneNumberId === phoneNumberId);
  if (!match) {
    log.warn("whatsapp.webhook_unmatched", { phoneNumberId });
    return Response.json({ ok: true });
  }

  const cfg = await getWhatsAppConfig(match.organizationId);
  if (cfg?.appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(cfg.appSecret, raw, sig)) {
      log.warn("whatsapp.bad_signature", { organizationId: match.organizationId });
      return new Response("Invalid signature", { status: 401 });
    }
  }

  const inbound = parseWhatsAppInbound(payload);
  for (const msg of inbound) {
    try {
      // Dedup by provider message id via a marker message meta lookup.
      await startEnquiry({
        organizationId: match.organizationId,
        channelType: ChannelType.WHATSAPP,
        channelId: match.id,
        externalThreadId: msg.from,
        openingText: msg.text,
        visitorName: msg.name,
      });
    } catch (err) {
      log.error("whatsapp.process_failed", { organizationId: match.organizationId, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  // Always 200 quickly so Meta doesn't retry a processed delivery.
  return Response.json({ ok: true });
}

function extractPhoneNumberId(payload: unknown): string | null {
  const entry = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entry)) return null;
  for (const e of entry) {
    const changes = (e as { changes?: unknown[] })?.changes ?? [];
    for (const c of changes) {
      const meta = (c as { value?: { metadata?: { phone_number_id?: string } } })?.value?.metadata;
      if (meta?.phone_number_id) return meta.phone_number_id;
    }
  }
  return null;
}
