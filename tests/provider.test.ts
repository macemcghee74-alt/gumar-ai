import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIProvider } from "@/lib/ai/provider";
import { readApiError } from "@/lib/api/error";

describe("provider fail-closed behavior", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not permit mock mode in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_PROVIDER", "mock");
    const provider = getAIProvider();
    expect(provider.getStatus().configured).toBe(false);
    await expect(provider.streamReply({ message: "Hello Gunmar" })).rejects.toThrow("No Gunmar cloud provider is configured");
  });
});

describe("api error parsing", () => {
  it("handles plaintext and JSON errors without throwing SyntaxError", async () => {
    const plainTextResponse = new Response("An error occurred while contacting the provider.", { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } });
    const plainTextError = await readApiError(plainTextResponse);
    expect(plainTextError.message).toContain("An error occurred");

    const jsonResponse = new Response(JSON.stringify({ error: { code: "provider_failure", message: "Upstream provider failed.", requestId: "abc123" } }), { status: 502, headers: { "content-type": "application/json" } });
    const jsonError = await readApiError(jsonResponse);
    expect(jsonError.code).toBe("provider_failure");
    expect(jsonError.requestId).toBe("abc123");
  });
});
