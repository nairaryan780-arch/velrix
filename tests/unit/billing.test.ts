import { describe, it, expect } from "vitest";
import { PLANS, isWithinLimit, periodKey } from "../../src/lib/billing/plans";

describe("billing plans", () => {
  it("defines the three plans with ascending limits", () => {
    expect(PLANS.STARTER.monthlyInr).toBe(2999);
    expect(PLANS.GROWTH.monthlyInr).toBe(6999);
    expect(PLANS.PRO.monthlyInr).toBe(14999);
    expect(PLANS.GROWTH.limits.messages).toBeGreaterThan(PLANS.STARTER.limits.messages);
    expect(PLANS.PRO.limits.messages).toBeGreaterThan(PLANS.GROWTH.limits.messages);
  });

  it("enforces limits", () => {
    expect(isWithinLimit(1999, 2000)).toBe(true);
    expect(isWithinLimit(2000, 2000)).toBe(false);
    expect(isWithinLimit(2001, 2000)).toBe(false);
  });

  it("produces a stable YYYY-MM period key", () => {
    expect(periodKey(new Date("2026-03-09T00:00:00Z"))).toBe("2026-03");
    expect(periodKey(new Date("2026-11-30T23:59:59Z"))).toBe("2026-11");
  });
});
