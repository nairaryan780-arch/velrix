import { prisma } from "@/lib/db";
import { route, parseJson, ok } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setActiveOrg } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const body = await parseJson(req, loginSchema);
  const email = body.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } } });
  const valid = user && (await verifyPassword(body.password, user.passwordHash));
  if (!user || !valid) {
    // Uniform error to avoid leaking which accounts exist.
    throw new HttpError(401, "invalid_credentials", "Incorrect email or password");
  }

  await createSession(user.id);
  const firstOrg = user.memberships[0];
  if (firstOrg) await setActiveOrg(firstOrg.organizationId);
  await audit({ action: "auth.login", userId: user.id, organizationId: firstOrg?.organizationId ?? null });

  const org = firstOrg
    ? await prisma.organization.findUnique({ where: { id: firstOrg.organizationId }, select: { onboardingComplete: true } })
    : null;
  const redirect = org && !org.onboardingComplete ? "/onboarding" : "/dashboard";
  return ok({ ok: true, redirect });
});
