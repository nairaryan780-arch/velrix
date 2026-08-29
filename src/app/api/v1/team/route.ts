import { route, parseJson, ok, badRequest, forbidden } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { inviteSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { sha256, randomToken } from "@/lib/crypto";
import { sendMail, resetEmail } from "@/lib/mailer";
import { env } from "@/lib/env";
import { assertUsage } from "@/lib/billing/usage";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

// Invite a teammate: create the user if needed and email a set-password link.
export const POST = route(async (req) => {
  const ctx = await requireOrg("team:manage");
  await assertUsage(ctx.org.id, "teamMembers");
  const body = await parseJson(req, inviteSchema);
  const email = body.email.toLowerCase().trim();

  let user = await prisma.user.findUnique({ where: { email } });
  let isNew = false;
  if (!user) {
    user = await prisma.user.create({ data: { email, name: body.name, passwordHash: await hashPassword(randomToken(16)) } });
    isNew = true;
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId: ctx.org.id, userId: user.id } },
  });
  if (existingMembership) throw badRequest("This person is already on your team");

  await prisma.membership.create({ data: { organizationId: ctx.org.id, userId: user.id, role: body.role } });

  // Send a set-password link so the invitee can sign in.
  const raw = randomToken(24);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
  await sendMail({ to: email, ...resetEmail(`${env.appUrl}/reset?token=${raw}`) });

  await audit({ action: "team.invite", organizationId: ctx.org.id, userId: ctx.user.id, entity: "user", entityId: user.id, meta: { role: body.role, isNew } });
  return ok({ ok: true, isNew });
});

const roleSchema = z.object({ userId: z.string(), role: z.enum(["ADMIN", "SALESPERSON", "VIEWER", "OWNER"]) });

export const PATCH = route(async (req) => {
  const ctx = await requireOrg("team:manage");
  const { userId, role } = await parseJson(req, roleSchema);
  if (userId === ctx.user.id) throw badRequest("You can't change your own role");
  // Only an owner can grant owner.
  if (role === "OWNER" && ctx.role !== "OWNER") throw forbidden("Only an owner can assign the owner role");
  await prisma.membership.updateMany({ where: { organizationId: ctx.org.id, userId }, data: { role } });
  await audit({ action: "team.role", organizationId: ctx.org.id, userId: ctx.user.id, entity: "user", entityId: userId, meta: { role } });
  return ok({ ok: true });
});

export const DELETE = route(async (req) => {
  const ctx = await requireOrg("team:manage");
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) throw badRequest("Missing userId");
  if (userId === ctx.user.id) throw badRequest("You can't remove yourself");

  // Never remove the last owner.
  const target = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId: ctx.org.id, userId } } });
  if (target?.role === "OWNER") {
    const owners = await prisma.membership.count({ where: { organizationId: ctx.org.id, role: "OWNER" } });
    if (owners <= 1) throw badRequest("You can't remove the last owner");
  }

  await prisma.membership.deleteMany({ where: { organizationId: ctx.org.id, userId } });
  await audit({ action: "team.remove", organizationId: ctx.org.id, userId: ctx.user.id, entity: "user", entityId: userId });
  return ok({ ok: true });
});
