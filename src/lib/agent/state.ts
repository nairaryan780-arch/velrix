export type ConversationFacts = {
  name?: string;
  email?: string;
  phone?: string;
  intent?: string;
  budget?: string;
  timeline?: string;
  location?: string;
  interest?: string;
  financing?: string;
  askedNextSteps?: boolean;
  optOut?: boolean;
  irrelevant?: boolean;
  buyingIntent?: number;
  notes?: string;
  answers: Record<string, string>;
};

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?91[\s-]?)?[6-9]\d{9}/;
const NAME = /(?:my name is|name's|i am|i'm|this is)\s+([A-Za-z]{2,20}(?:\s+[A-Za-z]{2,20})?)/i;
const NAME_STOP = /\s+(and|my|the|is|from|here|number|phone|email|mobile|contact|looking|want|need|interested|trying)\b.*$/i;
// Words that follow "I'm"/"I am" but are never names (e.g. "I'm looking for…").
const NON_NAME = new Set([
  "looking", "interested", "trying", "searching", "just", "still", "not", "here",
  "the", "from", "really", "very", "currently", "also", "keen", "hoping", "planning",
  "based", "new", "ready", "in", "at", "a", "an",
]);

export function mergeFacts(prev: ConversationFacts, incoming: Partial<ConversationFacts>): ConversationFacts {
  return {
    ...prev,
    ...Object.fromEntries(Object.entries(incoming).filter(([, v]) => v !== undefined && v !== "")),
    answers: { ...prev.answers, ...(incoming.answers ?? {}) },
    askedNextSteps: Boolean(prev.askedNextSteps || incoming.askedNextSteps),
    optOut: Boolean(prev.optOut || incoming.optOut),
    irrelevant: Boolean(prev.irrelevant || incoming.irrelevant),
    buyingIntent: Math.max(prev.buyingIntent ?? 0, incoming.buyingIntent ?? 0),
  };
}

export function extractFactsFromMessage(text: string, questionKeys: string[]): Partial<ConversationFacts> {
  const facts: Partial<ConversationFacts> = { answers: {} };
  const email = text.match(EMAIL)?.[0];
  const phone = text.match(PHONE)?.[0];
  const name = text.match(NAME)?.[1]?.trim();
  if (email) facts.email = email;
  if (phone) facts.phone = phone;
  if (name) {
    const cleaned = name.replace(NAME_STOP, "").replace(/[.,]$/, "").trim();
    const first = cleaned.split(/\s+/)[0]?.toLowerCase();
    if (cleaned.length >= 2 && first && !NON_NAME.has(first)) facts.name = cleaned;
  }

  const lower = text.toLowerCase();
  if (/(stop|unsubscribe|opt out|don't message)/.test(lower)) facts.optOut = true;
  if (/(next step|site visit|book|call me|whatsapp)/.test(lower)) facts.askedNextSteps = true;

  const budget = text.match(/(?:budget|around|upto|under)\s*(?:is\s*)?(₹?\s?[\d,.]+\s*(?:lakh|lac|cr|l|k)?)/i)?.[1];
  if (budget) {
    facts.budget = budget.trim();
    facts.answers = { ...facts.answers, budget: budget.trim() };
  }

  const timeline = text.match(
    /(this month|next month|immediately|asap|within \d+ days|in \d+ (?:days|weeks|months)|this week)/i,
  )?.[1];
  if (timeline) {
    facts.timeline = timeline;
    facts.answers = { ...facts.answers, timeline };
  }

  const location = text.match(
    /(?:in|at|near|location(?:\s+is)?)\s+([A-Za-z][A-Za-z\s]{2,30})/i,
  )?.[1];
  if (location && !/budget|touch|call/.test(location.toLowerCase())) {
    facts.location = location.trim();
    facts.answers = { ...facts.answers, location: location.trim() };
  }

  const interest = text.match(/(\d\s*bhk|villa|plot|apartment|flat|studio)/i)?.[1];
  if (interest) {
    facts.interest = interest;
    facts.answers = { ...facts.answers, interest };
  }

  for (const key of questionKeys) {
    if (facts.answers?.[key]) continue;
    const re = new RegExp(`${key}\\s*(?:is|:)?\\s*([A-Za-z0-9₹,.\-\\s]{2,40})`, "i");
    const m = text.match(re);
    if (m?.[1]) facts.answers = { ...facts.answers, [key]: m[1].trim() };
  }

  return facts;
}

export function missingQualification(
  answers: Record<string, string>,
  rules: { key: string; prompt: string; required: boolean }[],
) {
  return rules.filter((r) => r.required && !answers[r.key]?.trim());
}

export function emptyFacts(): ConversationFacts {
  return { answers: {} };
}
