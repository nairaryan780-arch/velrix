import { prisma } from "@/lib/db";
import { route, parseJson, ok } from "@/lib/http";
import { resetRequestSchema } from "@/lib/validation";
import { sha256, randomToken } from "@/lib/crypto";
import { sendMail, resetEmail } from "@/lib/mailer";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const { email } = await parseJson(req, resetRequestSchema);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Always return ok to avoid account enumeration.
  if (user) {
    const raw = randomToken(24);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 3600_000) },
    });
    const link = `${env.appUrl}/reset?token=${raw}`;
    await sendMail({ to: user.email, ...resetEmail(link) });
  }
  return ok({ ok: true });
});
