import { z } from "zod";

export const chatInputSchema = z.object({
  message: z.string().trim().min(1).max(12_000),
  conversationId: z.string().uuid().optional()
});

export type AIMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

export type ChatInput = z.infer<typeof chatInputSchema> & {
  messages?: AIMessage[];
};

export type AIUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AIProviderName = "cerebras" | "groq" | "openrouter";
export type AIProviderStatus = "available" | "missing_key" | "rate_limited" | "temporarily_failed" | "disabled";
export type AIProviderErrorCode = "configuration" | "rate_limit" | "timeout" | "provider";
export type BrainTaskType = "conversation" | "reasoning" | "memory_extraction" | "memory_retrieval_support" | "summarization" | "reflection" | "journal" | "tool_selection" | "research_synthesis" | "evaluation" | "training_data_generation";

export type ProviderCapabilities = {
  streaming: boolean;
  structuredOutputs: boolean;
  toolCalls: boolean;
  modalities: Array<"text">;
  taskTypes: BrainTaskType[];
};

export type BrainRequest = ChatInput & {
  taskType?: BrainTaskType;
  requiredCapabilities?: Partial<Pick<ProviderCapabilities, "structuredOutputs" | "toolCalls">>;
};

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly code: AIProviderErrorCode,
    readonly retryable = false,
    readonly status?: number,
    readonly provider?: AIProviderName
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export type AIStreamResult = {
  stream: ReadableStream<Uint8Array>;
  provider: AIProviderName;
  model: string;
  usage?: AIUsage;
  latencyMs: number;
};

export type ProviderStatus = {
  configured: boolean;
  status: AIProviderStatus;
};

export interface AIProvider {
  readonly name: AIProviderName;
  readonly model: string;
  readonly configured: boolean;
  readonly capabilities: ProviderCapabilities;
  getStatus(): ProviderStatus;
  streamReply(input: ChatInput, options?: { signal?: AbortSignal }): Promise<AIStreamResult>;
  streamTask(input: BrainRequest, options?: { signal?: AbortSignal }): Promise<AIStreamResult>;
}

type ProviderDefinition = {
  name: AIProviderName;
  endpoint: string;
  model: string;
  apiKey?: string;
  headers?: Record<string, string>;
};

const encoder = new TextEncoder();
const cooldowns = new Map<AIProviderName, { status: AIProviderStatus; until: number }>();
const providerNames = new Set<AIProviderName>(["cerebras", "groq", "openrouter"]);

export class OpenAICompatibleProvider implements AIProvider {
  readonly configured: boolean;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    structuredOutputs: false,
    toolCalls: true,
    modalities: ["text"],
    taskTypes: ["conversation", "reasoning", "memory_extraction", "memory_retrieval_support", "summarization", "reflection", "journal", "tool_selection", "research_synthesis", "evaluation", "training_data_generation"]
  };

  constructor(private readonly definition: ProviderDefinition) {
    this.configured = Boolean(definition.apiKey);
  }

  get name() {
    return this.definition.name;
  }

  get model() {
    return this.definition.model;
  }

  getStatus(): ProviderStatus {
    const cooldown = cooldowns.get(this.name);
    if (!this.configured) return { configured: false, status: "missing_key" };
    if (cooldown && cooldown.until > Date.now()) return { configured: true, status: cooldown.status };
    return { configured: true, status: "available" };
  }

  async streamReply(input: ChatInput, options?: { signal?: AbortSignal }): Promise<AIStreamResult> {
    if (!this.configured) {
      throw new AIProviderError(`${this.name} is not configured.`, "configuration", false, undefined, this.name);
    }

    const cooldown = cooldowns.get(this.name);
    if (cooldown && cooldown.until > Date.now()) {
      throw new AIProviderError(`${this.name} is temporarily unavailable.`, cooldown.status === "rate_limited" ? "rate_limit" : "provider", true, undefined, this.name);
    }

    const timeoutMs = Number(process.env.GUNMAR_PROVIDER_TIMEOUT_MS ?? 30_000);
    const startedAt = Date.now();
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), timeoutMs);
    const signal = options?.signal ? AbortSignal.any([options.signal, timeout.signal]) : timeout.signal;

    try {
      const response = await fetch(this.definition.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream, text/plain",
          authorization: `Bearer ${this.definition.apiKey}`,
          ...this.definition.headers
        },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          messages: input.messages ?? [{ role: "user", content: input.message }]
        }),
        signal
      });

      if (!response.ok || !response.body) {
        const retryable = response.status === 429 || response.status >= 500;
        const code = response.status === 429 ? "rate_limit" : "provider";
        setCooldown(this.name, code === "rate_limit" ? "rate_limited" : "temporarily_failed");
        throw new AIProviderError(`The ${this.name} provider returned status ${response.status}.`, code, retryable, response.status, this.name);
      }

      clearCooldown(this.name);
      const contentType = response.headers.get("content-type") ?? "";
      return {
        stream: contentType.includes("text/event-stream") ? parseSseTextStream(response.body) : response.body,
        provider: this.name,
        model: this.model,
        usage: readUsageHeaders(response.headers),
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (options?.signal?.aborted) throw error;
      if (timeout.signal.aborted) {
        setCooldown(this.name, "temporarily_failed");
        throw new AIProviderError(`The ${this.name} provider timed out.`, "timeout", true, undefined, this.name);
      }
      setCooldown(this.name, "temporarily_failed");
      throw new AIProviderError(`Unable to reach ${this.name}.`, "provider", true, undefined, this.name);
    } finally {
      clearTimeout(timer);
    }
  }

    streamTask(input: BrainRequest, options?: { signal?: AbortSignal }) {
      return this.streamReply(input, options);
    }
  }

export class CerebrasProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      name: "cerebras",
      endpoint: "https://api.cerebras.ai/v1/chat/completions",
      model: process.env.GUNMAR_CEREBRAS_MODEL ?? "gpt-oss-120b",
      apiKey: process.env.CEREBRAS_API_KEY
    });
  }
}

export class GroqProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      name: "groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: process.env.GUNMAR_GROQ_MODEL ?? "openai/gpt-oss-120b",
      apiKey: process.env.GROQ_API_KEY
    });
  }
}

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      name: "openrouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.GUNMAR_OPENROUTER_MODEL ?? "openrouter/free",
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        ...(process.env.NEXT_PUBLIC_APP_URL ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL } : {}),
        "X-OpenRouter-Title": "Gunmar AI"
      }
    });
  }
}

export class GunmarProviderRouter implements AIProvider {
  readonly name = "cerebras" as const;
  readonly model = "router";
  readonly configured = this.providers.some((provider) => provider.configured);
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    structuredOutputs: true,
    toolCalls: true,
    modalities: ["text"],
    taskTypes: ["conversation", "reasoning", "memory_extraction", "memory_retrieval_support", "summarization", "reflection", "journal", "tool_selection", "research_synthesis", "evaluation", "training_data_generation"]
  };

  constructor(protected readonly providers: AIProvider[]) {}

  getStatus(): ProviderStatus {
    return { configured: this.configured, status: this.configured ? "available" : "missing_key" };
  }

  get providerStatuses() {
    return Object.fromEntries(this.providers.map((provider) => [provider.name, provider.getStatus()])) as Record<AIProviderName, ProviderStatus>;
  }

  async streamReply(input: ChatInput, options?: { signal?: AbortSignal }): Promise<AIStreamResult> {
    return this.streamFromProviders(this.providers, input, options);
  }

  streamTask(input: BrainRequest, options?: { signal?: AbortSignal }) {
    return this.streamReply(input, options);
  }

  protected async streamFromProviders(providers: AIProvider[], input: ChatInput, options?: { signal?: AbortSignal }) {
    const failures: AIProviderError[] = [];
    for (const provider of providers) {
      if (provider.getStatus().status === "missing_key" || provider.getStatus().status === "rate_limited" || provider.getStatus().status === "temporarily_failed") continue;
      try {
        return await provider.streamReply(input, options);
      } catch (error) {
        if (error instanceof AIProviderError) failures.push(error);
        else throw error;
        if (options?.signal?.aborted) throw error;
      }
    }
    const last = failures[failures.length - 1];
    throw last ?? new AIProviderError("No Gunmar cloud provider is configured.", "configuration");
  }
}

export class GunmarBrainRouter extends GunmarProviderRouter {
  async streamTask(input: BrainRequest, options?: { signal?: AbortSignal }) {
    const taskType = input.taskType ?? "conversation";
    const preferredOrder = taskType === "memory_extraction" || taskType === "summarization" || taskType === "reflection" || taskType === "journal" || taskType === "tool_selection" || taskType === "training_data_generation"
      ? ["groq", "cerebras", "openrouter"]
      : taskType === "research_synthesis" || taskType === "evaluation"
        ? ["openrouter", "cerebras", "groq"]
        : ["cerebras", "groq", "openrouter"];
    const ordered = [...preferredOrder.map((name) => this.providers.find((provider) => provider.name === name)).filter((provider): provider is AIProvider => Boolean(provider)), ...this.providers]
      .filter((provider, index, all) => all.indexOf(provider) === index)
      .filter((provider) => supportsRequiredCapabilities(provider, input.requiredCapabilities));
    return this.streamFromProviders(ordered, input, options);
  }
}

export function getAIProvider(): AIProvider {
  if (process.env.AI_PROVIDER === "mock") {
    if (process.env.NODE_ENV === "production") return new FailClosedProvider();
    return new MockProvider();
  }
  return createProviderRouter();
}

export function createProviderRouter() {
  const providers = new Map<AIProviderName, AIProvider>([
    ["cerebras", new CerebrasProvider()],
    ["groq", new GroqProvider()],
    ["openrouter", new OpenRouterProvider()]
  ]);
  const requested = process.env.GUNMAR_PROVIDER_ORDER?.split(",").map((value) => value.trim().toLowerCase()).filter(isProviderName) ?? [];
  const fallback = [process.env.GUNMAR_PRIMARY_PROVIDER?.trim().toLowerCase(), "cerebras", "groq", "openrouter"].filter(isProviderName);
  const order = [...new Set(requested.length > 0 ? requested : fallback)];
  return new GunmarBrainRouter(order.map((name) => providers.get(name)).filter((provider): provider is AIProvider => Boolean(provider)));
}

export function getProviderStatuses() {
  return createProviderRouter().providerStatuses;
}

class MockProvider implements AIProvider {
  readonly name = "openrouter" as const;
  readonly model = "mock";
  readonly configured = true;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    structuredOutputs: false,
    toolCalls: false,
    modalities: ["text"],
    taskTypes: ["conversation"]
  };

  getStatus(): ProviderStatus {
    return { configured: true, status: "available" };
  }

  async streamReply(input: ChatInput, options?: { signal?: AbortSignal }): Promise<AIStreamResult> {
    if (options?.signal?.aborted) throw new DOMException("The request was aborted.", "AbortError");
    return {
      stream: streamText(`I’m Gunmar. I received: “${input.message}”\n\nConnect a cloud AI provider to enable full responses.`),
      provider: this.name,
      model: this.model,
      latencyMs: 0
    };
  }

  streamTask(input: BrainRequest, options?: { signal?: AbortSignal }) {
    return this.streamReply(input, options);
  }
}

class FailClosedProvider implements AIProvider {
  readonly name = "openrouter" as const;
  readonly model = "fail-closed";
  readonly configured = false;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    structuredOutputs: false,
    toolCalls: false,
    modalities: ["text"],
    taskTypes: ["conversation"]
  };

  getStatus(): ProviderStatus {
    return { configured: false, status: "missing_key" };
  }

  async streamReply(input: ChatInput, options?: { signal?: AbortSignal }): Promise<AIStreamResult> {
    void input;
    void options;
    throw new AIProviderError("No Gunmar cloud provider is configured.", "configuration", false, 503, this.name);
  }

  streamTask(input: BrainRequest, options?: { signal?: AbortSignal }) {
    return this.streamReply(input, options);
  }
}

function isProviderName(value: string | undefined): value is AIProviderName {
  return Boolean(value && providerNames.has(value as AIProviderName));
}

function supportsRequiredCapabilities(provider: AIProvider, required?: BrainRequest["requiredCapabilities"]) {
  if (!required) return true;
  return (!required.structuredOutputs || provider.capabilities.structuredOutputs)
    && (!required.toolCalls || provider.capabilities.toolCalls);
}

function setCooldown(provider: AIProviderName, status: AIProviderStatus) {
  cooldowns.set(provider, { status, until: Date.now() + (status === "rate_limited" ? 60_000 : 15_000) });
}

function clearCooldown(provider: AIProviderName) {
  cooldowns.delete(provider);
}

export function resetProviderCooldowns(provider?: AIProviderName) {
  if (provider) cooldowns.delete(provider);
  else cooldowns.clear();
}

function streamText(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });
}

function parseSseTextStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) emitSseData(buffer, controller);
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";
      for (const event of events) {
        if (emitSseData(event, controller)) {
          controller.close();
          await reader.cancel();
          return;
        }
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    }
  });
}

function emitSseData(event: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("");
  if (!data) return false;
  if (data === "[DONE]") return true;
  try {
    const payload: unknown = JSON.parse(data);
    const choices: unknown[] = payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).choices)
      ? (payload as Record<string, unknown>).choices as unknown[]
      : [];
    const choice = choices[0];
    const delta = choice && typeof choice === "object" ? (choice as Record<string, unknown>).delta : undefined;
    const text = delta && typeof delta === "object" && typeof (delta as Record<string, unknown>).content === "string"
      ? (delta as Record<string, string>).content
      : "";
    if (text) controller.enqueue(encoder.encode(text));
  } catch {
    controller.enqueue(encoder.encode(data));
  }
  return false;
}

function readUsageHeaders(headers: Headers): AIUsage | undefined {
  const inputHeader = headers.get("x-input-tokens");
  const outputHeader = headers.get("x-output-tokens");
  const inputTokens = inputHeader === null ? undefined : Number(inputHeader);
  const outputTokens = outputHeader === null ? undefined : Number(outputHeader);
  if (inputTokens === undefined && outputTokens === undefined) return undefined;
  return {
    inputTokens: inputTokens !== undefined && Number.isFinite(inputTokens) ? inputTokens : undefined,
    outputTokens: outputTokens !== undefined && Number.isFinite(outputTokens) ? outputTokens : undefined,
    totalTokens: inputTokens !== undefined && outputTokens !== undefined && Number.isFinite(inputTokens) && Number.isFinite(outputTokens) ? inputTokens + outputTokens : undefined
  };
}
