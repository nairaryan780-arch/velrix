import { route, parseJson, ok, badRequest, forbidden } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { orgUpdateSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const PATCH = route(async (req) => {
  const ctx = await requireOrg("org:write");
  const body = await parseJson(req, orgUpdateSchema);
  await prisma.organization.update({
    where: { id: ctx.org.id },
    data: {
      name: body.name ?? undefined,
      industry: body.industry ?? undefined,
      website: body.website === "" ? null : body.website ?? undefined,
      whatWeSell: body.whatWeSell ?? undefined,
      timezone: body.timezone ?? undefined,
    },
  });
  await audit({ action: "org.update", organizationId: ctx.org.id, userId: ctx.user.id });
  return ok({ ok: true });
});

// Permanently delete the organization and all its data (owner only).
export const DELETE = route(async (req) => {
  const ctx = await requireOrg();
  if (ctx.role !== "OWNER") throw forbidden("Only an owner can delete the workspace");
  const confirm = new URL(req.url).searchParams.get("confirm");
  if (confirm !== ctx.org.slug) throw badRequest("Confirmation does not match the workspace slug");

  await audit({ action: "org.delete", organizationId: ctx.org.id, userId: ctx.user.id, meta: { name: ctx.org.name } });
  await prisma.organization.delete({ where: { id: ctx.org.id } });
  return ok({ ok: true });
});
