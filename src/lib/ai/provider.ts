import { z } from "zod";

export const chatInputSchema = z.object({
  message: z.string().trim().min(1).max(12_000),
  conversationId: z.string().uuid().optional()
});

export type ChatInput = z.infer<typeof chatInputSchema>;

export interface AIProvider {
  streamReply(input: ChatInput): Promise<ReadableStream<Uint8Array>>;
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
  async streamReply(input: ChatInput): Promise<ReadableStream<Uint8Array>> {
    const endpoint = process.env.AI_PROVIDER_ENDPOINT;
    const apiKey = process.env.AI_PROVIDER_API_KEY;

    if (!endpoint || !apiKey) {
      throw new Error("AI provider is not configured. Set AI_PROVIDER_ENDPOINT and AI_PROVIDER_API_KEY.");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.AI_MODEL, messages: [{ role: "user", content: input.message }] })
    });

    if (!response.ok || !response.body) {
      throw new Error(`AI provider request failed with status ${response.status}.`);
    }

    return response.body;
  }
}

class MockProvider implements AIProvider {
  async streamReply(input: ChatInput): Promise<ReadableStream<Uint8Array>> {
    return streamText(`I’m Gunmar. I received: “${input.message}”\n\nConnect a cloud AI provider to enable full responses.`);
  }
}

export function getAIProvider(): AIProvider {
  return process.env.AI_PROVIDER === "mock" || !process.env.AI_PROVIDER
    ? new MockProvider()
    : new ConfiguredProvider();
}
