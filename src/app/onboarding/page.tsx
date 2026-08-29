import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (ctx.org.onboardingComplete) redirect("/dashboard");

  const agent = await prisma.agent.findFirst({ where: { organizationId: ctx.org.id } });

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="aurora" />
      <OnboardingWizard
        initial={{
          name: ctx.org.name,
          industry: ctx.org.industry,
          website: ctx.org.website ?? "",
          whatWeSell: ctx.org.whatWeSell ?? "",
          agentName: agent?.name ?? "Velrix",
          tone: agent?.tone ?? "professional",
        }}
      />
    </div>
  );
}
