import { z } from "zod";

export const codingPhaseSchema = z.enum([
  "understand",
  "inspect",
  "plan",
  "execute",
  "verify",
  "diagnose",
  "repair",
  "review",
  "complete"
]);
export type CodingPhase = z.infer<typeof codingPhaseSchema>;

export const codingTaskSchema = z.object({
  request: z.string().trim().min(1).max(8_000),
  workspaceRoot: z.string().trim().min(1),
  maxSteps: z.number().int().positive().max(100).default(30),
  maxRuntimeMs: z.number().int().positive().max(15 * 60_000).default(5 * 60_000),
  maxProviderCalls: z.number().int().positive().max(20).default(8),
  maxRetries: z.number().int().nonnegative().max(5).default(2)
});
export type CodingTask = z.infer<typeof codingTaskSchema>;

export type CodingToolRisk = "read" | "verify" | "workspace_write" | "network" | "destructive";

export type CodingToolCall = {
  name: string;
  input: Record<string, unknown>;
  risk: CodingToolRisk;
  startedAt: string;
  finishedAt?: string;
  outcome?: "succeeded" | "failed" | "blocked";
};

export type CodingRun = {
  task: CodingTask;
  phase: CodingPhase;
  steps: number;
  providerCalls: number;
  toolCalls: CodingToolCall[];
  startedAt: string;
  finishedAt?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  error?: string;
};
