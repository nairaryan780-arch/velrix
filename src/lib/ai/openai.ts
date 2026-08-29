import { env } from "../env";
import { log } from "../logger";
import {
  AIProviderError,
  type AIProvider,
  type CompletionRequest,
  type CompletionResult,
  withRetry,
  withTimeout,
} from "./provider";

export class OpenAIProvider implements AIProvider {
  id = "openai";

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!env.openaiKey) {
      throw new AIProviderError("OPENAI_API_KEY is not configured", false);
    }
    const run = async () => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.openaiModel,
          temperature: req.temperature ?? 0.3,
          max_tokens: req.maxTokens ?? 700,
          messages: req.messages,
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        throw new AIProviderError(`OpenAI HTTP ${res.status}`, true);
      }
      if (!res.ok) {
        const body = await res.text();
        throw new AIProviderError(`OpenAI error: ${body.slice(0, 300)}`, false);
      }
      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
        model: string;
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      log.info("ai.complete", {
        provider: "openai",
        model: json.model,
        promptTokens: json.usage?.prompt_tokens,
        completionTokens: json.usage?.completion_tokens,
      });
      return {
        text,
        provider: "openai",
        model: json.model ?? env.openaiModel,
        promptTokens: json.usage?.prompt_tokens,
        completionTokens: json.usage?.completion_tokens,
        fallback: false,
      };
    };
    return withRetry(() => withTimeout(run(), env.aiTimeoutMs));
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!env.openaiKey) throw new AIProviderError("OPENAI_API_KEY is not configured", false);
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: env.openaiEmbeddingModel, input: texts }),
    });
    if (!res.ok) throw new AIProviderError(`Embedding error ${res.status}`, res.status >= 500);
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data.map((d) => d.embedding);
  }
}
