import { prisma } from "../db";
import { decryptSecret } from "../crypto";
import { log } from "../logger";

/**
 * Instagram Messaging (Meta) adapter.
 *
 * REQUIRES EXTERNAL CREDENTIALS: an Instagram-connected Facebook Page access
 * token. Shares Meta webhook signature verification with the WhatsApp adapter.
 */
export type InstagramConfig = {
  pageId: string;
  accessToken: string;
  appSecret?: string;
};

export async function getInstagramConfig(organizationId: string): Promise<InstagramConfig | null> {
  const integ = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "instagram" } },
  });
  if (!integ || integ.status !== "connected") return null;
  try {
    const creds = JSON.parse(decryptSecret(integ.encryptedCredentials)) as InstagramConfig;
    if (!creds.pageId || !creds.accessToken) return null;
    return creds;
  } catch (err) {
    log.warn("instagram.bad_credentials", { organizationId, error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

export async function sendInstagramText(organizationId: string, recipientId: string | null, text: string) {
  if (!recipientId) return { delivered: false as const, reason: "no_recipient" as const };
  const cfg = await getInstagramConfig(organizationId);
  if (!cfg) {
    log.warn("instagram.not_configured", { organizationId });
    return { delivered: false as const, reason: "requires_credentials" as const };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${cfg.pageId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    if (!res.ok) {
      const body = await res.text();
      log.error("instagram.send_failed", { organizationId, status: res.status, body: body.slice(0, 200) });
      await prisma.integration.updateMany({
        where: { organizationId, provider: "instagram" },
        data: { status: "error", lastError: `send HTTP ${res.status}` },
      });
      return { delivered: false as const, reason: "provider_error" as const, status: res.status };
    }
    return { delivered: true as const };
  } catch (err) {
    log.error("instagram.send_exception", { organizationId, error: err instanceof Error ? err.message : "unknown" });
    return { delivered: false as const, reason: "network_error" as const };
  }
}

export function parseInstagramInbound(payload: unknown): { from: string; text: string }[] {
  const out: { from: string; text: string }[] = [];
  const entry = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entry)) return out;
  for (const e of entry) {
    const messaging = (e as { messaging?: unknown[] })?.messaging ?? [];
    for (const m of messaging) {
      const msg = m as { sender?: { id?: string }; message?: { text?: string; is_echo?: boolean } };
      if (msg.sender?.id && msg.message?.text && !msg.message.is_echo) {
        out.push({ from: msg.sender.id, text: msg.message.text });
      }
    }
  }
  return out;
}
