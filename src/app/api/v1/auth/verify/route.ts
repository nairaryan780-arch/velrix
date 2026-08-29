import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// Email verification link handler. Redirects back into the app either way.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return Response.redirect(`${env.appUrl}/login?verify=invalid`, 302);

  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.expiresAt < new Date()) {
    return Response.redirect(`${env.appUrl}/login?verify=expired`, 302);
  }

  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } });
  return Response.redirect(`${env.appUrl}/dashboard?verified=1`, 302);
}
