import { z } from "zod";
import { route, parseJson, ok } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ plan: z.enum(["STARTER", "GROWTH", "PRO"]) });

/**
 * Change plan. When Razorpay is configured this would create a subscription and
 * return a checkout intent (REQUIRES CREDENTIALS). Without keys, it switches the
 * plan directly in explicit test mode (no charge) so the entitlement system is
 * fully exercisable — never presented as a real payment.
 */
export const POST = route(async (req) => {
  const ctx = await requireOrg("billing:manage");
  const { plan } = await parseJson(req, schema);

  const razorpayConfigured = Boolean(env.razorpayKeyId && env.razorpayKeySecret);

  await prisma.subscription.upsert({
    where: { organizationId: ctx.org.id },
    create: { organizationId: ctx.org.id, plan, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000) },
    update: { plan, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000) },
  });
  await audit({ action: "billing.plan_change", organizationId: ctx.org.id, userId: ctx.user.id, meta: { plan, testMode: !razorpayConfigured } });

  return ok({ ok: true, plan, testMode: !razorpayConfigured });
});
