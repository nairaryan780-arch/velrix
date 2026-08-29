import { route, parseJson, ok, badRequest } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { integrationSchema } from "@/lib/validation";
import { encryptSecret } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const REQUIRED_FIELDS: Record<string, string[]> = {
  whatsapp: ["phoneNumberId", "accessToken"],
  instagram: ["pageId", "accessToken"],
  razorpay: ["keyId", "keySecret"],
};

// Connect (store encrypted credentials) or reconnect an external integration.
export const POST = route(async (req) => {
  const ctx = await requireOrg("channels:write");
  const { provider, credentials } = await parseJson(req, integrationSchema);

  const missing = (REQUIRED_FIELDS[provider] ?? []).filter((f) => !credentials[f]?.trim());
  if (missing.length) throw badRequest(`Missing required credentials: ${missing.join(", ")}`);

  const encrypted = encryptSecret(JSON.stringify(credentials));
  await prisma.integration.upsert({
    where: { organizationId_provider: { organizationId: ctx.org.id, provider } },
    create: { organizationId: ctx.org.id, provider, encryptedCredentials: encrypted, status: "connected" },
    update: { encryptedCredentials: encrypted, status: "connected", lastError: null },
  });

  // Reflect connected state on the matching channel (if any). Store the
  // non-secret provider id (phoneNumberId / pageId) in configJson so inbound
  // webhooks can resolve the tenant without decrypting every integration.
  const channelType = provider === "whatsapp" ? "WHATSAPP" : provider === "instagram" ? "INSTAGRAM" : null;
  if (channelType) {
    const lookup = provider === "whatsapp" ? { phoneNumberId: credentials.phoneNumberId } : { pageId: credentials.pageId };
    await prisma.channel.upsert({
      where: { organizationId_type: { organizationId: ctx.org.id, type: channelType } },
      create: {
        organizationId: ctx.org.id,
        type: channelType,
        name: channelType === "WHATSAPP" ? "WhatsApp" : "Instagram",
        status: "CONNECTED",
        publicKey: `${provider}_${ctx.org.id.slice(-8)}`,
        configJson: lookup,
      },
      update: { status: "CONNECTED", errorMessage: null, configJson: lookup },
    });
  }

  await audit({ action: "integration.connect", organizationId: ctx.org.id, userId: ctx.user.id, entity: "integration", entityId: provider });
  return ok({ ok: true, status: "connected" });
});

export const DELETE = route(async (req) => {
  const ctx = await requireOrg("channels:write");
  const provider = new URL(req.url).searchParams.get("provider");
  if (!provider) throw badRequest("Missing provider");

  await prisma.integration.deleteMany({ where: { organizationId: ctx.org.id, provider } });
  const channelType = provider === "whatsapp" ? "WHATSAPP" : provider === "instagram" ? "INSTAGRAM" : null;
  if (channelType) {
    await prisma.channel.updateMany({ where: { organizationId: ctx.org.id, type: channelType }, data: { status: "DISCONNECTED" } });
  }
  await audit({ action: "integration.disconnect", organizationId: ctx.org.id, userId: ctx.user.id, entity: "integration", entityId: provider });
  return ok({ ok: true });
});
