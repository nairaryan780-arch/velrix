import { route, ok } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Mark notifications read: { id } for one, or {} for all.
export const PATCH = route(async (req) => {
  const ctx = await requireOrg("org:read");
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (body.id) {
    await prisma.notification.updateMany({ where: { id: body.id, organizationId: ctx.org.id }, data: { readAt: new Date() } });
  } else {
    await prisma.notification.updateMany({ where: { organizationId: ctx.org.id, readAt: null }, data: { readAt: new Date() } });
  }
  return ok({ ok: true });
});
