import { cookies, headers } from "next/headers";
import { prisma } from "../db";
import { sha256, randomToken } from "../crypto";
import { env } from "../env";
import { unauthorized } from "../http";

export const SESSION_COOKIE = "velrix_session";
export const ORG_COOKIE = "velrix_org";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
};

/** Issues a new session: random token in an httpOnly cookie, only its hash in the DB. */
export async function createSession(userId: string) {
  const raw = randomToken(32);
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  const h = await headers();
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: h.get("user-agent") || null,
    },
  });
  const c = await cookies();
  c.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    expires: expiresAt,
  });
  return { expiresAt };
}

export async function destroySession() {
  const c = await cookies();
  const raw = c.get(SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(raw) } });
    c.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const raw = c.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(raw) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  return { id: u.id, email: u.email, name: u.name, emailVerifiedAt: u.emailVerifiedAt };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw unauthorized();
  return u;
}

export async function setActiveOrg(organizationId: string) {
  const c = await cookies();
  c.set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
