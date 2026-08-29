import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/dashboard/shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (!ctx.org.onboardingComplete) redirect("/onboarding");

  const unread = await prisma.notification.count({ where: { organizationId: ctx.org.id, readAt: null } });

  return (
    <Shell
      org={{ id: ctx.org.id, name: ctx.org.name, agentActive: ctx.org.agentActive, isDemo: ctx.org.isDemo }}
      user={{ name: ctx.user.name, email: ctx.user.email }}
      role={ctx.role}
      unread={unread}
    >
      {children}
    </Shell>
  );
}
