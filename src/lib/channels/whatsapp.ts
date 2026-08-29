import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "../db";
import { decryptSecret } from "../crypto";
import { log } from "../logger";

/**
 * WhatsApp Cloud API (Meta) adapter.
 *
 * REQUIRES EXTERNAL CREDENTIALS: a Meta WhatsApp Business phone number id and a
 * permanent access token, stored encrypted in the Integration table. Without a
 * connected integration, sends return { delivered:false, reason:"requires_credentials" }
 * — we never fake a successful external delivery.
 */
export type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
  appSecret?: string;
};

export async function getWhatsAppConfig(organizationId: string): Promise<WhatsAppConfig | null> {
  const integ = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "whatsapp" } },
  });
  if (!integ || integ.status !== "connected") return null;
  try {
    const creds = JSON.parse(decryptSecret(integ.encryptedCredentials)) as WhatsAppConfig;
    if (!creds.phoneNumberId || !creds.accessToken) return null;
    return creds;
  } catch (err) {
    log.warn("whatsapp.bad_credentials", { organizationId, error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

export async function sendWhatsAppText(organizationId: string, to: string | null, text: string) {
  if (!to) return { delivered: false as const, reason: "no_recipient" as const };
  const cfg = await getWhatsAppConfig(organizationId);
  if (!cfg) {
    log.warn("whatsapp.not_configured", { organizationId });
    return { delivered: false as const, reason: "requires_credentials" as const };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
    });
    if (!res.ok) {
      const body = await res.text();
      log.error("whatsapp.send_failed", { organizationId, status: res.status, body: body.slice(0, 200) });
      await prisma.integration.updateMany({
        where: { organizationId, provider: "whatsapp" },
        data: { status: "error", lastError: `send HTTP ${res.status}` },
      });
      return { delivered: false as const, reason: "provider_error" as const, status: res.status };
    }
    return { delivered: true as const };
  } catch (err) {
    log.error("whatsapp.send_exception", { organizationId, error: err instanceof Error ? err.message : "unknown" });
    return { delivered: false as const, reason: "network_error" as const };
  }
}

/** Verifies the X-Hub-Signature-256 header Meta sends with webhook deliveries. */
export function verifyMetaSignature(appSecret: string, rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Parses inbound WhatsApp webhook payloads into normalized enquiries. */
export function parseWhatsAppInbound(payload: unknown): { from: string; text: string; name?: string }[] {
  const out: { from: string; text: string; name?: string }[] = [];
  const entry = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entry)) return out;
  for (const e of entry) {
    const changes = (e as { changes?: unknown[] })?.changes ?? [];
    for (const c of changes) {
      const value = (c as { value?: Record<string, unknown> })?.value;
      const messages = (value?.messages as unknown[]) ?? [];
      const contacts = (value?.contacts as { profile?: { name?: string } }[]) ?? [];
      for (const m of messages) {
        const msg = m as { from?: string; text?: { body?: string }; type?: string };
        if (msg.type === "text" && msg.from && msg.text?.body) {
          out.push({ from: msg.from, text: msg.text.body, name: contacts[0]?.profile?.name });
        }
      }
    }
  }
  return out;
}
