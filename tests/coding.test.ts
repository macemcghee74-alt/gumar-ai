import { describe, expect, it } from "vitest";
import { CodingOrchestrator } from "@/lib/coding/orchestrator";
import { authorizeCodingTool, resolveWorkspacePath } from "@/lib/coding/policy";
import { codingTaskSchema } from "@/lib/coding/types";

describe("coding agent safety", () => {
  it("keeps tool paths inside the workspace and blocks secrets", () => {
    expect(resolveWorkspacePath("C:\\workspace", "src/index.ts")).toContain("workspace");
    expect(() => resolveWorkspacePath("C:\\workspace", "..\\outside.txt")).toThrow();
    expect(() => resolveWorkspacePath("C:\\workspace", ".env.local")).toThrow();
  });

  it("requires approval for destructive tools", () => {
    expect(() => authorizeCodingTool("destructive")).toThrow();
    expect(authorizeCodingTool("destructive", true)).toBe(true);
  });

  it("enforces bounded coding phases and provider calls", async () => {
    const orchestrator = new CodingOrchestrator();
    const run = await orchestrator.run(codingTaskSchema.parse({ request: "inspect", workspaceRoot: "C:\\workspace", maxProviderCalls: 1 }), {
      providerCall: async () => undefined
    });
    expect(run.status).toBe("completed");
    expect(run.steps).toBeLessThanOrEqual(30);
    expect(run.providerCalls).toBe(1);
  });
});
