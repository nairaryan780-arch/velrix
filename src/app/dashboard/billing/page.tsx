import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/rbac";
import { env } from "@/lib/env";
import { PLANS } from "@/lib/billing/plans";
import { getEntitlements, usageCount, countResource } from "@/lib/billing/usage";
import { PageHeader } from "@/components/dashboard/ui";
import { BillingPanel } from "@/components/dashboard/billing-panel";
import type { PlanCode } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const { plan, limits } = await getEntitlements(ctx.org.id);
  const [messages, leads, channels, teamMembers, knowledgeSources] = await Promise.all([
    usageCount(ctx.org.id, "messages"),
    usageCount(ctx.org.id, "leads"),
    countResource(ctx.org.id, "channels"),
    countResource(ctx.org.id, "teamMembers"),
    countResource(ctx.org.id, "knowledgeSources"),
  ]);

  const usage = [
    { metric: "messages", label: "AI messages", used: messages, limit: limits.messages },
    { metric: "leads", label: "Leads", used: leads, limit: limits.leads },
    { metric: "channels", label: "Channels", used: channels, limit: limits.channels },
    { metric: "teamMembers", label: "Team members", used: teamMembers, limit: limits.teamMembers },
    { metric: "knowledgeSources", label: "Knowledge sources", used: knowledgeSources, limit: limits.knowledgeSources },
  ];

  const plans = (Object.keys(PLANS) as PlanCode[]).map((code) => ({
    code,
    name: PLANS[code].name,
    monthlyInr: PLANS[code].monthlyInr,
    description: PLANS[code].description,
    limits: PLANS[code].limits as unknown as Record<string, number>,
  }));

  return (
    <div>
      <PageHeader title="Billing" subtitle="Your plan, usage and entitlements." />
      <BillingPanel
        plans={plans}
        currentPlan={plan}
        usage={usage}
        canManage={can(ctx.role, "billing:manage")}
        razorpayConfigured={Boolean(env.razorpayKeyId && env.razorpayKeySecret)}
      />
    </div>
  );
}
