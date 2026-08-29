import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { parseSteps } from "@/lib/followups";
import { PageHeader } from "@/components/dashboard/ui";
import { AutomationsPanel } from "@/components/dashboard/automations-panel";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const [rules, sequence] = await Promise.all([
    prisma.qualificationRule.findMany({ where: { organizationId: ctx.org.id }, orderBy: { sortOrder: "asc" } }),
    prisma.followUpSequence.findFirst({ where: { organizationId: ctx.org.id } }),
  ]);

  return (
    <div>
      <PageHeader title="Automations" subtitle="Configure qualification and automatic follow-ups." />
      <AutomationsPanel
        rules={rules.map((r) => ({ key: r.key, prompt: r.prompt, required: r.required, weight: r.weight }))}
        sequence={{
          name: sequence?.name ?? "Default follow-up",
          active: sequence?.active ?? true,
          maxAttempts: sequence?.maxAttempts ?? 2,
          steps: sequence ? parseSteps(sequence.stepsJson) : [],
        }}
      />
    </div>
  );
}
