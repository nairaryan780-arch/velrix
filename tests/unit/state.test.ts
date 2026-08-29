import { describe, it, expect } from "vitest";
import { extractFactsFromMessage, mergeFacts, missingQualification, emptyFacts } from "../../src/lib/agent/state";

describe("extractFactsFromMessage", () => {
  it("extracts email, phone and a clean name", () => {
    const f = extractFactsFromMessage("Hi, my name is Rahul Sharma, email rahul@example.com, phone 9812345678", []);
    expect(f.name).toBe("Rahul Sharma");
    expect(f.email).toBe("rahul@example.com");
    expect(f.phone).toBe("9812345678");
  });

  it("does not treat 'I'm looking for' as a name", () => {
    const f = extractFactsFromMessage("I'm looking for a 2BHK", []);
    expect(f.name).toBeUndefined();
  });

  it("extracts real-estate interest, budget, timeline and location", () => {
    const f = extractFactsFromMessage("I want a 2BHK in Whitefield, budget around 90 lakh, this month", []);
    expect(f.interest?.toLowerCase()).toContain("2");
    expect(f.budget).toBeTruthy();
    expect(f.timeline?.toLowerCase()).toContain("this month");
    expect(f.location?.toLowerCase()).toContain("whitefield");
  });

  it("detects opt-out and next-step intent", () => {
    expect(extractFactsFromMessage("please stop messaging me", []).optOut).toBe(true);
    expect(extractFactsFromMessage("can you book a site visit?", []).askedNextSteps).toBe(true);
  });
});

describe("mergeFacts", () => {
  it("keeps sticky booleans and merges answers", () => {
    const a = mergeFacts(emptyFacts(), { optOut: true, answers: { budget: "90L" } });
    const b = mergeFacts(a, { optOut: false, answers: { timeline: "this month" } });
    expect(b.optOut).toBe(true);
    expect(b.answers).toEqual({ budget: "90L", timeline: "this month" });
  });
});

describe("missingQualification", () => {
  it("returns only unanswered required rules", () => {
    const rules = [
      { key: "budget", prompt: "Budget?", required: true },
      { key: "timeline", prompt: "When?", required: true },
      { key: "financing", prompt: "Loan?", required: false },
    ];
    const missing = missingQualification({ budget: "90L" }, rules);
    expect(missing.map((m) => m.key)).toEqual(["timeline"]);
  });
});
