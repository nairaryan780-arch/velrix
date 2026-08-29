import { z } from "zod";
import { route, parseJson, ok } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { getIndustry } from "@/lib/industries";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  step: z.number().min(1).max(10).optional(),
  complete: z.boolean().optional(),
  industry: z.string().max(40).optional(),
});

export const POST = route(async (req) => {
  const ctx = await requireOrg("org:write");
  const body = await parseJson(req, schema);

  // When the industry changes during onboarding, reseed qualification rules
  // from that industry's template (only if the org still has none customized).
  if (body.industry && body.industry !== ctx.org.industry) {
    const existing = await prisma.qualificationRule.count({ where: { organizationId: ctx.org.id } });
    if (existing === 0) {
      const industry = getIndustry(body.industry);
      await prisma.qualificationRule.createMany({
        data: industry.qualification.map((q, i) => ({ organizationId: ctx.org.id, key: q.key, prompt: q.prompt, required: q.required, weight: q.weight, sortOrder: i })),
      });
    }
  }

  await prisma.organization.update({
    where: { id: ctx.org.id },
    data: {
      onboardingStep: body.step ?? ctx.org.onboardingStep,
      onboardingComplete: body.complete ? true : ctx.org.onboardingComplete,
      agentActive: body.complete ? true : ctx.org.agentActive,
    },
  });

  if (body.complete) await audit({ action: "onboarding.complete", organizationId: ctx.org.id, userId: ctx.user.id });
  return ok({ ok: true, complete: Boolean(body.complete) });
});
