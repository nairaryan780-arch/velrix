import { route, parseJson, ok } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { qualificationRulesSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

// Replace the org's qualification rules atomically.
export const PUT = route(async (req) => {
  const ctx = await requireOrg("agent:write");
  const { rules } = await parseJson(req, qualificationRulesSchema);

  await prisma.$transaction([
    prisma.qualificationRule.deleteMany({ where: { organizationId: ctx.org.id } }),
    prisma.qualificationRule.createMany({
      data: rules.map((r, i) => ({ organizationId: ctx.org.id, key: r.key, prompt: r.prompt, required: r.required, weight: r.weight, sortOrder: i })),
    }),
  ]);
  await audit({ action: "qualification.update", organizationId: ctx.org.id, userId: ctx.user.id, meta: { count: rules.length } });
  return ok({ ok: true });
});
