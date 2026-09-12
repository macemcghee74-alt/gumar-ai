export const MEMORY_EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingResult = {
  vector: number[];
  model: string;
  provider: "openrouter";
  latencyMs: number;
  dimensions: number;
  version: number;
};

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  readonly configured: boolean;
  embed(text: string, options?: { signal?: AbortSignal }): Promise<EmbeddingResult>;
  embedBatch(texts: string[], options?: { signal?: AbortSignal }): Promise<EmbeddingResult[]>;
}

export class OpenRouterEmbeddingProvider implements EmbeddingProvider {
  readonly model = process.env.GUNMAR_EMBEDDING_MODEL ?? "";
  readonly dimensions = Number(process.env.GUNMAR_EMBEDDING_DIMENSIONS ?? MEMORY_EMBEDDING_DIMENSIONS);
  readonly configured = Boolean(process.env.OPENROUTER_API_KEY && this.model);
  readonly version = Number(process.env.GUNMAR_EMBEDDING_VERSION ?? 1);

  async embed(text: string, options?: { signal?: AbortSignal }) {
    const [result] = await this.embedBatch([text], options);
    return result;
  }

  async embedBatch(texts: string[], options?: { signal?: AbortSignal }): Promise<EmbeddingResult[]> {
    if (!this.configured) throw new Error("OpenRouter embeddings are not configured.");
    if (texts.length === 0) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.GUNMAR_EMBEDDING_TIMEOUT_MS ?? 15_000));
    const signal = options?.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
    const startedAt = Date.now();
    try {
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          ...(process.env.NEXT_PUBLIC_APP_URL ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL } : {}),
          "X-OpenRouter-Title": "Gunmar AI"
        },
        body: JSON.stringify({ model: this.model, input: texts }),
        signal
      });
      if (!response.ok) throw new Error(`OpenRouter embeddings returned status ${response.status}.`);
      const payload: unknown = await response.json();
      const data = payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).data)
        ? (payload as Record<string, unknown>).data as unknown[] : [];
      const vectors = data.map((item) => item && typeof item === "object" && Array.isArray((item as Record<string, unknown>).embedding)
        ? (item as Record<string, unknown>).embedding as unknown[] : []);
      if (vectors.length !== texts.length || vectors.some((vector) => vector.length !== this.dimensions || vector.some((value) => typeof value !== "number" || !Number.isFinite(value)))) {
        throw new Error(`Embedding dimension mismatch: expected ${this.dimensions}.`);
      }
      return vectors.map((vector) => ({ vector: vector as number[], model: this.model, provider: "openrouter" as const, latencyMs: Date.now() - startedAt, dimensions: this.dimensions, version: this.version }));
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getEmbeddingProvider(): EmbeddingProvider {
  return new OpenRouterEmbeddingProvider();
}
