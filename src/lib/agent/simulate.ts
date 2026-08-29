import { prisma } from "../db";
import { completeWithFallback } from "../ai";
import { buildSystemPrompt } from "./engine";
import { retrieveChunks } from "./rag";
import { sanitizeCustomerInput } from "./safety";
import { estimateBuyingIntent, scoreLead, type ScoreThresholds } from "./scoring";
import { emptyFacts, extractFactsFromMessage, mergeFacts, missingQualification, type ConversationFacts } from "./state";

export type SimTurn = { role: "user" | "assistant"; content: string };

/**
 * Stateless preview of the configured agent — same retrieval, prompt, scoring
 * and safety as production, but nothing is persisted (no lead, no analytics, no
 * usage). Powers the Agent test simulator.
 */
export async function simulateAgent(organizationId: string, history: SimTurn[]) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { agents: true, qualificationRules: { orderBy: { sortOrder: "asc" } } },
  });
  const agent = org.agents[0];
  if (!agent) throw new Error("Agent is not configured");

  // Accumulate facts across the whole simulated conversation.
  let facts: ConversationFacts = emptyFacts();
  const ruleKeys = org.qualificationRules.map((r) => r.key);
  for (const turn of history) {
    if (turn.role !== "user") continue;
    const extracted = extractFactsFromMessage(turn.content, ruleKeys);
    facts = mergeFacts(facts, { ...extracted, buyingIntent: estimateBuyingIntent(turn.content) });
  }

  const lastUser = [...history].reverse().find((t) => t.role === "user")?.content ?? "";
  const sanitized = sanitizeCustomerInput(lastUser);

  const sources = await prisma.knowledgeSource.findMany({
    where: { organizationId, approved: true, status: "READY" },
    include: { chunks: true },
  });
  const chunks = sources.flatMap((s) => s.chunks.map((c) => ({ content: c.content, embedding: c.embedding as number[] | null })));
  const retrieved = retrieveChunks(sanitized.text, chunks, 5);
  const knowledgeText = retrieved.map((r) => r.content).join("\n---\n");

  const missing = missingQualification(facts.answers, org.qualificationRules);
  const scoring = (agent.scoringJson ?? {}) as { thresholds?: ScoreThresholds };
  const score = scoreLead({
    answers: org.qualificationRules.map((r) => ({ key: r.key, value: facts.answers[r.key], required: r.required, weight: r.weight })),
    buyingIntent: facts.buyingIntent ?? 5,
    askedNextSteps: Boolean(facts.askedNextSteps),
    irrelevant: Boolean(facts.irrelevant),
    optedOut: Boolean(facts.optOut),
    thresholds: scoring.thresholds,
  });

  const completion = await completeWithFallback({
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({
          orgName: org.name,
          industry: org.industry,
          agentName: agent.name,
          tone: agent.tone,
          description: agent.businessDescription,
          instructions: agent.instructions,
          policies: agent.policies,
          whatWeSell: org.whatWeSell ?? "",
          knowledgeText,
          facts,
          missing: missing.map((m) => m.prompt),
          injection: sanitized.injectionAttempt,
        }),
      },
      ...history.slice(-12).map((t) => ({ role: t.role, content: t.content })),
    ],
  });

  return {
    reply: completion.text.trim(),
    provider: completion.provider,
    fallback: completion.fallback,
    score: score.score,
    temperature: score.temperature,
    facts: {
      interest: facts.interest,
      location: facts.location,
      budget: facts.budget,
      timeline: facts.timeline,
      intent: facts.intent,
      name: facts.name,
    },
    missing: missing.map((m) => ({ key: m.key, prompt: m.prompt })),
  };
}
