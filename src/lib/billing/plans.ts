import type { PlanCode } from "../constants";

export type PlanLimits = {
  messages: number;
  leads: number;
  channels: number;
  agents: number;
  knowledgeSources: number;
  teamMembers: number;
};

export const PLANS: Record<
  PlanCode,
  { name: string; monthlyInr: number; limits: PlanLimits; description: string }
> = {
  STARTER: {
    name: "Starter",
    monthlyInr: 2999,
    description: "Website chat, one agent, core qualification.",
    limits: { messages: 2000, leads: 200, channels: 1, agents: 1, knowledgeSources: 20, teamMembers: 3 },
  },
  GROWTH: {
    name: "Growth",
    monthlyInr: 6999,
    description: "More volume, extra channel, team selling.",
    limits: { messages: 8000, leads: 1000, channels: 2, agents: 2, knowledgeSources: 80, teamMembers: 8 },
  },
  PRO: {
    name: "Pro",
    monthlyInr: 14999,
    description: "Full channel stack and higher usage.",
    limits: { messages: 25000, leads: 4000, channels: 4, agents: 5, knowledgeSources: 250, teamMembers: 25 },
  },
};

export function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isWithinLimit(used: number, limit: number) {
  return used < limit;
}
