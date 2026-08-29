import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/ui";
import { AgentConsole } from "@/components/dashboard/agent-console";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const agent = await prisma.agent.findFirst({ where: { organizationId: ctx.org.id } });
  if (!agent) redirect("/onboarding");

  const scoring = (agent.scoringJson as { thresholds?: { hot: number; warm: number } } | null) ?? {};
  const handoff = (agent.handoffJson as Record<string, boolean | number> | null) ?? {};

  return (
    <div>
      <PageHeader title="Agent" subtitle="Configure your AI sales agent and test it live." />
      <AgentConsole
        initial={{
          name: agent.name,
          tone: agent.tone,
          businessDescription: agent.businessDescription,
          instructions: agent.instructions,
          policies: agent.policies,
          scoring: { thresholds: { hot: scoring.thresholds?.hot ?? 70, warm: scoring.thresholds?.warm ?? 40 } },
          handoff: handoff as AgentConsoleHandoff,
          active: ctx.org.agentActive,
        }}
      />
    </div>
  );
}

type AgentConsoleHandoff = { hotAutoNotify?: boolean; hotScore?: number; onHumanRequest?: boolean; onLowConfidence?: boolean };
