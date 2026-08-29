import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Razorpay webhook. REQUIRES EXTERNAL CREDENTIALS (RAZORPAY_WEBHOOK_SECRET).
 * Verifies the X-Razorpay-Signature HMAC and updates subscription status on
 * payment / subscription events. Without a webhook secret configured, it rejects
 * (never trusts unsigned billing events).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = env.razorpayWebhookSecret;
  if (!secret) {
    log.warn("razorpay.webhook_unconfigured");
    return new Response("Webhook secret not configured", { status: 503 });
  }

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event?: string; payload?: { subscription?: { entity?: { id?: string; status?: string; notes?: { organizationId?: string } } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const sub = event.payload?.subscription?.entity;
  const organizationId = sub?.notes?.organizationId;
  if (organizationId && sub) {
    const statusMap: Record<string, string> = { active: "ACTIVE", authenticated: "ACTIVE", halted: "PAST_DUE", cancelled: "CANCELED", completed: "ACTIVE" };
    const status = statusMap[sub.status ?? ""] ?? "INCOMPLETE";
    await prisma.subscription.updateMany({
      where: { organizationId },
      data: { status, razorpaySubscriptionId: sub.id ?? undefined },
    });
    log.info("razorpay.webhook", { organizationId, event: event.event, status });
  }

  return Response.json({ ok: true });
}
