import { cookies } from "next/headers";
import type { Organization } from "@prisma/client";
import type { Role } from "../constants";
import { prisma } from "../db";
import { unauthorized } from "../http";
import { getCurrentUser, ORG_COOKIE, type SessionUser } from "./session";
import { assertCan, type Permission } from "./rbac";

export type OrgContext = {
  user: SessionUser;
  org: Organization;
  role: Role;
  membershipId: string;
};

/**
 * Resolves the caller's active organization and role. This is the tenant
 * isolation boundary: it verifies server-side that the user is a member of the
 * org before any org-scoped query runs. Returns null when unauthenticated or
 * the user has no workspace.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const c = await cookies();
  const preferredOrgId = c.get(ORG_COOKIE)?.value;

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) return null;

  const chosen = memberships.find((m) => m.organizationId === preferredOrgId) ?? memberships[0];
  return { user, org: chosen.organization, role: chosen.role as Role, membershipId: chosen.id };
}

export async function requireOrg(permission?: Permission): Promise<OrgContext> {
  const ctx = await getOrgContext();
  if (!ctx) throw unauthorized("No workspace access");
  if (permission) assertCan(ctx.role, permission);
  return ctx;
}

export async function listMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
}
