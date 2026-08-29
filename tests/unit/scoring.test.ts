import { describe, it, expect } from "vitest";
import { scoreLead, estimateBuyingIntent, clamp } from "../../src/lib/agent/scoring";

const rules = [
  { key: "location", value: undefined as string | undefined, required: true, weight: 18 },
  { key: "budget", value: undefined as string | undefined, required: true, weight: 22 },
  { key: "interest", value: undefined as string | undefined, required: true, weight: 16 },
  { key: "timeline", value: undefined as string | undefined, required: true, weight: 20 },
];

describe("scoreLead", () => {
  it("returns COLD with no answers", () => {
    const r = scoreLead({ answers: rules, buyingIntent: 5, askedNextSteps: false, irrelevant: false, optedOut: false });
    expect(r.temperature).toBe("COLD");
    expect(r.qualified).toBe(false);
    expect(r.score).toBeLessThan(40);
  });

  it("marks a fully-answered, high-intent lead HOT and qualified", () => {
    const answered = rules.map((r) => ({ ...r, value: "x" }));
    const r = scoreLead({ answers: answered, buyingIntent: 18, askedNextSteps: true, irrelevant: false, optedOut: false });
    expect(r.temperature).toBe("HOT");
    expect(r.qualified).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("respects custom thresholds", () => {
    const answered = rules.map((r) => ({ ...r, value: "x" }));
    const r = scoreLead({ answers: answered, buyingIntent: 10, askedNextSteps: false, irrelevant: false, optedOut: false, thresholds: { hot: 95, warm: 50 } });
    expect(r.temperature).toBe("WARM");
  });

  it("short-circuits opt-out and irrelevant enquiries", () => {
    expect(scoreLead({ answers: rules, buyingIntent: 20, askedNextSteps: true, irrelevant: false, optedOut: true }).score).toBe(0);
    expect(scoreLead({ answers: rules, buyingIntent: 20, askedNextSteps: true, irrelevant: true, optedOut: false }).temperature).toBe("COLD");
  });

  it("never exceeds 100 or drops below 0", () => {
    const answered = rules.map((r) => ({ ...r, value: "x", weight: 100 }));
    const r = scoreLead({ answers: answered, buyingIntent: 20, askedNextSteps: true, irrelevant: false, optedOut: false });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(clamp(-5)).toBe(0);
    expect(clamp(150)).toBe(100);
  });
});

describe("estimateBuyingIntent", () => {
  it("rewards urgency and next-step signals", () => {
    expect(estimateBuyingIntent("I want to buy this month, ready to move")).toBeGreaterThan(10);
    expect(estimateBuyingIntent("call me to schedule an appointment")).toBeGreaterThan(8);
  });
  it("penalises browsing language", () => {
    expect(estimateBuyingIntent("just looking, maybe later")).toBeLessThan(5);
  });
});
