import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { route, parseJson, ok, notFound } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  active: z.boolean().optional(),
  maxAttempts: z.number().min(1).max(5).optional(),
  steps: z
    .array(z.object({ delayMinutes: z.number().min(5).max(43200), message: z.string().min(1).max(1000) }))
    .max(5)
    .optional(),
});

export const PATCH = route(async (req) => {
  const ctx = await requireOrg("agent:write");
  const body = await parseJson(req, schema);

  const sequence = await prisma.followUpSequence.findFirst({ where: { organizationId: ctx.org.id } });
  if (!sequence) throw notFound("No follow-up sequence found");

  const data: Prisma.FollowUpSequenceUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.active !== undefined) data.active = body.active;
  if (body.maxAttempts !== undefined) data.maxAttempts = body.maxAttempts;
  if (body.steps !== undefined) data.stepsJson = body.steps as Prisma.InputJsonValue;

  await prisma.followUpSequence.update({ where: { id: sequence.id }, data });
  await audit({ action: "automation.update", organizationId: ctx.org.id, userId: ctx.user.id, entity: "followup", entityId: sequence.id });
  return ok({ ok: true });
});
