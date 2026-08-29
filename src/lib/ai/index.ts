import { env } from "../env";
import { log } from "../logger";
import { LocalSalesProvider } from "./local";
import { OpenAIProvider } from "./openai";
import { AIProviderError, type AIProvider, type CompletionRequest, type CompletionResult } from "./provider";

const openai = new OpenAIProvider();
const local = new LocalSalesProvider();

export function getAIProvider(): AIProvider {
  if (env.aiProvider === "local") return local;
  if (env.openaiKey) return openai;
  return local;
}

export async function completeWithFallback(req: CompletionRequest): Promise<CompletionResult> {
  const primary = getAIProvider();
  try {
    return await primary.complete(req);
  } catch (err) {
    log.error("ai.primary_failed", { error: err instanceof Error ? err.message : "unknown" });
    if (primary.id !== "local") {
      const fallback = await local.complete(req);
      return { ...fallback, fallback: true };
    }
    if (err instanceof AIProviderError) throw err;
    throw new AIProviderError("AI unavailable", true);
  }
}

export async function embedTexts(texts: string[]) {
  if (env.openaiKey) {
    try {
      return await openai.embed!(texts);
    } catch (err) {
      log.warn("ai.embed_failed", { error: err instanceof Error ? err.message : "unknown" });
    }
  }
  return texts.map((t) => lexicalVector(t));
}

export function lexicalVector(text: string, size = 64) {
  const vec = new Array(size).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const tok of tokens) {
    let h = 0;
    for (let i = 0; i < tok.length; i++) h = (h * 31 + tok.charCodeAt(i)) >>> 0;
    vec[h % size] += 1;
  }
  const mag = Math.sqrt(vec.reduce((s, n) => s + n * n, 0)) || 1;
  return vec.map((n) => n / mag);
}

export function cosine(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / ((Math.sqrt(magA) || 1) * (Math.sqrt(magB) || 1));
}
