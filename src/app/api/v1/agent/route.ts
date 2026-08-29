import type { Prisma } from "@prisma/client";
import { route, parseJson, ok, notFound } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { agentConfigSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const PATCH = route(async (req) => {
  const ctx = await requireOrg("agent:write");
  const body = await parseJson(req, agentConfigSchema);

  const agent = await prisma.agent.findFirst({ where: { organizationId: ctx.org.id } });
  if (!agent) throw notFound("Agent not found");

  const data: Prisma.AgentUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.tone !== undefined) data.tone = body.tone;
  if (body.businessDescription !== undefined) data.businessDescription = body.businessDescription;
  if (body.instructions !== undefined) data.instructions = body.instructions;
  if (body.policies !== undefined) data.policies = body.policies;
  if (body.scoring) data.scoringJson = { thresholds: body.scoring.thresholds } as Prisma.InputJsonValue;
  if (body.handoff) {
    const current = (agent.handoffJson as Record<string, unknown>) ?? {};
    data.handoffJson = { ...current, ...body.handoff } as Prisma.InputJsonValue;
  }
  if (body.widget) {
    const current = (agent.widgetJson as Record<string, unknown>) ?? {};
    data.widgetJson = { ...current, ...body.widget } as Prisma.InputJsonValue;
  }

  await prisma.agent.update({ where: { id: agent.id }, data });

  if (body.active !== undefined) {
    await prisma.organization.update({ where: { id: ctx.org.id }, data: { agentActive: body.active } });
  }

  await audit({ action: "agent.update", organizationId: ctx.org.id, userId: ctx.user.id, entity: "agent", entityId: agent.id });
  return ok({ ok: true });
});
