import { prisma } from "./db";
import { log } from "./logger";

export type AnalyticsDelta = Partial<{
  enquiries: number;
  qualified: number;
  hot: number;
  warm: number;
  cold: number;
  handoffs: number;
  followUps: number;
  won: number;
  lost: number;
  responseMsSum: number;
  responseCount: number;
}>;

const COUNTERS: (keyof AnalyticsDelta)[] = [
  "enquiries",
  "qualified",
  "hot",
  "warm",
  "cold",
  "handoffs",
  "followUps",
  "won",
  "lost",
  "responseMsSum",
  "responseCount",
];

export function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Atomically increments the day's analytics counters for an organization.
 * Uses an upsert so the first event of the day creates the row.
 */
export async function bumpAnalytics(organizationId: string, delta: AnalyticsDelta) {
  const day = startOfUtcDay();
  const increments: Record<string, { increment: number }> = {};
  const creates: Record<string, number> = {};
  for (const key of COUNTERS) {
    const value = delta[key];
    if (value && value !== 0) {
      increments[key] = { increment: value };
      creates[key] = value;
    }
  }
  if (Object.keys(increments).length === 0) return;

  try {
    await prisma.analyticsDaily.upsert({
      where: { organizationId_day: { organizationId, day } },
      create: { organizationId, day, ...creates },
      update: increments,
    });
  } catch (err) {
    // Analytics must never break a customer-facing turn.
    log.warn("analytics.bump_failed", {
      organizationId,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

export type AnalyticsSummary = {
  enquiries: number;
  qualified: number;
  hot: number;
  warm: number;
  cold: number;
  handoffs: number;
  followUps: number;
  won: number;
  lost: number;
  avgResponseMs: number | null;
  qualificationRate: number | null;
};

/**
 * Aggregates the last `days` of AnalyticsDaily rows into a single summary.
 */
export async function analyticsSummary(organizationId: string, days = 30): Promise<AnalyticsSummary> {
  const since = startOfUtcDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  const rows = await prisma.analyticsDaily.findMany({
    where: { organizationId, day: { gte: since } },
  });
  const totals = rows.reduce(
    (acc, r) => {
      acc.enquiries += r.enquiries;
      acc.qualified += r.qualified;
      acc.hot += r.hot;
      acc.warm += r.warm;
      acc.cold += r.cold;
      acc.handoffs += r.handoffs;
      acc.followUps += r.followUps;
      acc.won += r.won;
      acc.lost += r.lost;
      acc.responseMsSum += r.responseMsSum;
      acc.responseCount += r.responseCount;
      return acc;
    },
    {
      enquiries: 0,
      qualified: 0,
      hot: 0,
      warm: 0,
      cold: 0,
      handoffs: 0,
      followUps: 0,
      won: 0,
      lost: 0,
      responseMsSum: 0,
      responseCount: 0,
    },
  );

  return {
    enquiries: totals.enquiries,
    qualified: totals.qualified,
    hot: totals.hot,
    warm: totals.warm,
    cold: totals.cold,
    handoffs: totals.handoffs,
    followUps: totals.followUps,
    won: totals.won,
    lost: totals.lost,
    avgResponseMs: totals.responseCount > 0 ? Math.round(totals.responseMsSum / totals.responseCount) : null,
    qualificationRate: totals.enquiries > 0 ? totals.qualified / totals.enquiries : null,
  };
}

/**
 * Daily time series for charting (oldest first).
 */
export async function analyticsSeries(organizationId: string, days = 14) {
  const since = startOfUtcDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  const rows = await prisma.analyticsDaily.findMany({
    where: { organizationId, day: { gte: since } },
    orderBy: { day: "asc" },
  });
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    enquiries: r.enquiries,
    qualified: r.qualified,
    hot: r.hot,
    handoffs: r.handoffs,
  }));
}
