import { describe, it, expect } from "vitest";
import { can, assertCan } from "../../src/lib/auth/rbac";

describe("rbac", () => {
  it("grants owners full access", () => {
    expect(can("OWNER", "billing:manage")).toBe(true);
    expect(can("OWNER", "team:manage")).toBe(true);
    expect(can("OWNER", "agent:write")).toBe(true);
  });

  it("restricts viewers to read-only", () => {
    expect(can("VIEWER", "leads:read")).toBe(true);
    expect(can("VIEWER", "leads:write")).toBe(false);
    expect(can("VIEWER", "conversations:takeover")).toBe(false);
    expect(can("VIEWER", "billing:manage")).toBe(false);
  });

  it("lets salespeople work leads but not manage billing/team", () => {
    expect(can("SALESPERSON", "conversations:takeover")).toBe(true);
    expect(can("SALESPERSON", "leads:write")).toBe(true);
    expect(can("SALESPERSON", "billing:manage")).toBe(false);
    expect(can("SALESPERSON", "team:manage")).toBe(false);
  });

  it("assertCan throws 403 when not permitted", () => {
    expect(() => assertCan("VIEWER", "agent:write")).toThrowError();
    try {
      assertCan("VIEWER", "agent:write");
    } catch (e) {
      expect((e as { status: number }).status).toBe(403);
    }
  });
});
