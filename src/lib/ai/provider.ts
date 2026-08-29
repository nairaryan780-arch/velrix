export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type CompletionRequest = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type CompletionResult = {
  text: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  fallback: boolean;
};

export interface AIProvider {
  id: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  embed?(texts: string[]): Promise<number[][]>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
  }
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 400): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const retryable = err instanceof AIProviderError ? err.retryable : i < attempts - 1;
      if (!retryable || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw last;
}

export function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new AIProviderError("AI request timed out", true)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
