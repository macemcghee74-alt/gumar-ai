import { describe, expect, it } from "vitest";
import { getEmbeddingProvider, MEMORY_EMBEDDING_DIMENSIONS } from "@/lib/embeddings/provider";

describe("embedding provider", () => {
  it("matches the pgvector memory dimension", () => {
    const provider = getEmbeddingProvider();
    expect(provider.dimensions).toBe(MEMORY_EMBEDDING_DIMENSIONS);
  });

  it("fails closed when no explicit embedding model is configured", async () => {
    const provider = getEmbeddingProvider();
    if (!provider.configured) {
      await expect(provider.embed("test")).rejects.toThrow("not configured");
    }
  });
});
