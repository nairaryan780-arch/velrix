import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { can } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/dashboard/ui";
import { TeamPanel } from "@/components/dashboard/team-panel";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { organizationId: ctx.org.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader title="Team" subtitle="Invite salespeople and manage roles & permissions." />
      <TeamPanel
        members={memberships.map((m) => ({ userId: m.user.id, name: m.user.name, email: m.user.email, role: m.role, isSelf: m.user.id === ctx.user.id }))}
        canManage={can(ctx.role, "team:manage")}
        isOwner={ctx.role === "OWNER"}
      />
    </div>
  );
}
