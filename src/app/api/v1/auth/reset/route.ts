import { prisma } from "@/lib/db";
import { route, parseJson, ok, badRequest } from "@/lib/http";
import { resetSchema } from "@/lib/validation";
import { hashPassword, passwordStrengthError } from "@/lib/auth/password";
import { sha256 } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const body = await parseJson(req, resetSchema);
  const strength = passwordStrengthError(body.password);
  if (strength) throw badRequest(strength);

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(body.token) } });
  if (!record || record.expiresAt < new Date()) throw badRequest("This reset link is invalid or has expired");

  const passwordHash = await hashPassword(body.password);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });
  // Invalidate existing sessions after a password reset.
  await prisma.session.deleteMany({ where: { userId: record.userId } });
  await audit({ action: "auth.password_reset", userId: record.userId });

  return ok({ ok: true });
});
