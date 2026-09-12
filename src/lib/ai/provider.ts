import { z } from "zod";

export const chatInputSchema = z.object({
  message: z.string().trim().min(1).max(12_000),
  conversationId: z.string().uuid().optional()
});

export type ChatInput = z.infer<typeof chatInputSchema>;

export type AIUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AIProviderErrorCode = "configuration" | "rate_limit" | "timeout" | "provider";

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly code: AIProviderErrorCode,
    readonly retryable = false,
    readonly status?: number
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export type AIStreamResult = {
  stream: ReadableStream<Uint8Array>;
  provider: string;
  model: string;
  usage?: AIUsage;
};

export interface AIProvider {
  streamReply(input: ChatInput, options?: { signal?: AbortSignal }): Promise<AIStreamResult>;
}

const encoder = new TextEncoder();

function streamText(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });
}

class ConfiguredProvider implements AIProvider {
  async streamReply(input: ChatInput, options?: { signal?: AbortSignal }): Promise<AIStreamResult> {
    const endpoint = process.env.AI_PROVIDER_ENDPOINT;
    const apiKey = process.env.AI_PROVIDER_API_KEY;
    const provider = process.env.AI_PROVIDER_NAME ?? "cloud";
    const model = process.env.AI_MODEL;
    const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 30_000);

    if (!endpoint || !apiKey || !model) {
      throw new AIProviderError(
        "AI provider is not configured. Set AI_PROVIDER_ENDPOINT, AI_PROVIDER_API_KEY, and AI_MODEL.",
        "configuration"
      );
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const timeout = new AbortController();
      const timer = setTimeout(() => timeout.abort(), timeoutMs);
      const signal = options?.signal
        ? AbortSignal.any([options.signal, timeout.signal])
        : timeout.signal;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "text/event-stream, text/plain",
            authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages: [{ role: "user", content: input.message }]
          }),
          signal
        });

        if (response.ok && response.body) {
          return {
            stream: response.body,
            provider,
            model,
            usage: readUsageHeaders(response.headers)
          };
        }

        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === 3) {
          throw new AIProviderError(
            `AI provider request failed with status ${response.status}.`,
            response.status === 429 ? "rate_limit" : "provider",
            retryable,
            response.status
          );
        }
        await delay(backoffMs(attempt));
      } catch (error) {
        if (error instanceof AIProviderError) throw error;
        if (options?.signal?.aborted) throw error;
        if (timeout.signal.aborted) {
          if (attempt === 3) throw new AIProviderError("AI provider request timed out.", "timeout", true);
          await delay(backoffMs(attempt));
          continue;
        }
        if (attempt === 3) throw new AIProviderError("Unable to reach the AI provider.", "provider", true);
        await delay(backoffMs(attempt));
      } finally {
        clearTimeout(timer);
      }
    }

    throw new AIProviderError("AI provider request failed.", "provider", true);
  }
}

class MockProvider implements AIProvider {
  async streamReply(input: ChatInput): Promise<AIStreamResult> {
    return {
      stream: streamText(`I’m Gunmar. I received: “${input.message}”\n\nConnect a cloud AI provider to enable full responses.`),
      provider: "mock",
      model: "mock"
    };
  }
}

export function getAIProvider(): AIProvider {
  return process.env.AI_PROVIDER === "mock" || !process.env.AI_PROVIDER
    ? new MockProvider()
    : new ConfiguredProvider();
}

function backoffMs(attempt: number) {
  return Math.min(1_000 * 2 ** (attempt - 1), 8_000);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function readUsageHeaders(headers: Headers): AIUsage | undefined {
  const inputTokens = Number(headers.get("x-input-tokens"));
  const outputTokens = Number(headers.get("x-output-tokens"));
  if (!Number.isFinite(inputTokens) && !Number.isFinite(outputTokens)) return undefined;
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : undefined,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : undefined,
    totalTokens: Number.isFinite(inputTokens) && Number.isFinite(outputTokens) ? inputTokens + outputTokens : undefined
  };
}
