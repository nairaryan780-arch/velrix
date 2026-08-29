import { prisma } from "../db";
import { periodKey, PLANS } from "./plans";
import type { PlanCode } from "../constants";

export class UsageLimitError extends Error {
  status = 402;
  constructor(public metric: string) {
    super(`Plan limit reached for ${metric}`);
  }
}

export async function getEntitlements(organizationId: string) {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  const plan = (sub?.plan ?? "STARTER") as PlanCode;
  const active =
    !sub ||
    sub.status === "ACTIVE" ||
    sub.status === "TRIALING";
  return { plan, limits: PLANS[plan].limits, status: sub?.status ?? "TRIALING", active };
}

export async function usageCount(organizationId: string, metric: string) {
  const period = periodKey();
  const rows = await prisma.usageRecord.aggregate({
    where: { organizationId, metric, period },
    _sum: { quantity: true },
  });
  return rows._sum.quantity ?? 0;
}

export async function incrementUsage(organizationId: string, metric: string, quantity = 1) {
  const period = periodKey();
  await prisma.usageRecord.create({
    data: { organizationId, metric, quantity, period },
  });
}

export async function assertUsage(organizationId: string, metric: keyof ReturnType<typeof limitsOf>) {
  const { limits, active } = await getEntitlements(organizationId);
  if (!active) throw new UsageLimitError("subscription");
  const used = await usageCount(organizationId, metric);
  if (used >= limits[metric]) throw new UsageLimitError(metric);
}

function limitsOf() {
  return PLANS.STARTER.limits;
}

export async function countResource(organizationId: string, metric: string) {
  switch (metric) {
    case "channels":
      return prisma.channel.count({ where: { organizationId, status: "CONNECTED" } });
    case "agents":
      return prisma.agent.count({ where: { organizationId } });
    case "knowledgeSources":
      return prisma.knowledgeSource.count({ where: { organizationId } });
    case "teamMembers":
      return prisma.membership.count({ where: { organizationId } });
    default:
      return usageCount(organizationId, metric);
  }
}
