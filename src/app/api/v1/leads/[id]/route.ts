import { route, parseJson, ok, notFound } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { leadUpdateSchema } from "@/lib/validation";
import { markLeadOutcome } from "@/lib/conversations";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const PATCH = route(async (req, rc) => {
  const ctx = await requireOrg("leads:write");
  const { id } = (await rc.params) ?? {};
  const body = await parseJson(req, leadUpdateSchema);

  const lead = await prisma.lead.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!lead) throw notFound("Lead not found");

  if (body.status) {
    await markLeadOutcome(ctx.org.id, lead.id, body.status, body.outcomeNote, ctx.user.id);
  }
  if (body.assignedToId !== undefined) {
    if (body.assignedToId) {
      const member = await prisma.membership.findFirst({ where: { organizationId: ctx.org.id, userId: body.assignedToId } });
      if (!member) throw notFound("That team member is not in this workspace");
    }
    await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: body.assignedToId } });
    await audit({ action: "lead.assign", organizationId: ctx.org.id, userId: ctx.user.id, entity: "lead", entityId: lead.id, meta: { assignedToId: body.assignedToId } });
  }
  if (body.outcomeNote !== undefined && !body.status) {
    await prisma.lead.update({ where: { id: lead.id }, data: { outcomeNote: body.outcomeNote } });
  }

  return ok({ ok: true });
});
