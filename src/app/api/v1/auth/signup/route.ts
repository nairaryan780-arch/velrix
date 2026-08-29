import { prisma } from "@/lib/db";
import { route, parseJson, conflict, ok } from "@/lib/http";
import { signupSchema } from "@/lib/validation";
import { hashPassword, passwordStrengthError } from "@/lib/auth/password";
import { badRequest } from "@/lib/http";
import { createSession, setActiveOrg } from "@/lib/auth/session";
import { createOrganizationForUser } from "@/lib/provision";
import { sha256, randomToken } from "@/lib/crypto";
import { sendMail, verificationEmail } from "@/lib/mailer";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const body = await parseJson(req, signupSchema);
  const strength = passwordStrengthError(body.password);
  if (strength) throw badRequest(strength);

  const email = body.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict("An account with this email already exists");

  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user.create({
    data: { email, name: body.name.trim(), passwordHash },
  });

  const org = await createOrganizationForUser(user.id, {
    name: body.organizationName?.trim() || `${body.name.split(" ")[0]}'s workspace`,
  });

  // Email verification (logged in dev when SMTP is not configured).
  const raw = randomToken(24);
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 24 * 3600_000) },
  });
  const link = `${env.appUrl}/api/v1/auth/verify?token=${raw}`;
  await sendMail({ to: email, ...verificationEmail(link) });

  await createSession(user.id);
  await setActiveOrg(org.id);
  await audit({ action: "auth.signup", organizationId: org.id, userId: user.id, entity: "user", entityId: user.id });

  return ok({ ok: true, redirect: "/onboarding" });
});
