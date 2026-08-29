export type ScoreThresholds = {
  hot: number;
  warm: number;
};

export const DEFAULT_THRESHOLDS: ScoreThresholds = { hot: 70, warm: 40 };

export type QualificationAnswer = {
  key: string;
  value?: string;
  required: boolean;
  weight: number;
};

export type ScoreInput = {
  answers: QualificationAnswer[];
  buyingIntent: number;
  askedNextSteps: boolean;
  irrelevant: boolean;
  optedOut: boolean;
  thresholds?: ScoreThresholds;
};

export type ScoreResult = {
  score: number;
  temperature: "HOT" | "WARM" | "COLD";
  reasons: string[];
  qualified: boolean;
};

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function scoreLead(input: ScoreInput): ScoreResult {
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;
  const reasons: string[] = [];

  if (input.optedOut) {
    return { score: 0, temperature: "COLD", reasons: ["Customer opted out"], qualified: false };
  }
  if (input.irrelevant) {
    return { score: 8, temperature: "COLD", reasons: ["Enquiry is not relevant to this business"], qualified: false };
  }

  const filledRequired = input.answers.filter((a) => a.required && a.value?.trim());
  const required = input.answers.filter((a) => a.required);
  const weightTotal = input.answers.reduce((s, a) => s + a.weight, 0) || 1;
  const earned = input.answers.reduce((s, a) => s + (a.value?.trim() ? a.weight : 0), 0);
  let score = Math.round((earned / weightTotal) * 70);
  score += clamp(input.buyingIntent, 0, 20);
  if (input.askedNextSteps) score += 10;
  score = clamp(score);

  for (const a of input.answers) {
    if (a.value?.trim()) reasons.push(`${label(a.key)} confirmed`);
  }
  if (input.buyingIntent >= 15) reasons.push("High buying intent");
  else if (input.buyingIntent >= 8) reasons.push("Moderate buying intent");
  if (input.askedNextSteps) reasons.push("Asked for next steps");
  if (filledRequired.length < required.length) {
    reasons.push(`Missing ${required.length - filledRequired.length} required qualification field(s)`);
  }

  const temperature =
    score >= thresholds.hot ? "HOT" : score >= thresholds.warm ? "WARM" : "COLD";
  const qualified = filledRequired.length === required.length && score >= thresholds.warm;

  return { score, temperature, reasons, qualified };
}

function label(key: string) {
  return key.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function estimateBuyingIntent(text: string) {
  const t = text.toLowerCase();
  let n = 5;
  if (/(this month|asap|urgent|immediately|ready to buy|book a visit|site visit)/.test(t)) n += 12;
  if (/(next steps|call me|whatsapp me|schedule|appointment)/.test(t)) n += 8;
  if (/(just looking|browsing|maybe later|not sure)/.test(t)) n -= 6;
  return clamp(n, 0, 20);
}
