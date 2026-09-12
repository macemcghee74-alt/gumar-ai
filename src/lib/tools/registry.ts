import { z } from "zod";

export type ToolRisk = "read" | "internal_write" | "external_action" | "high_impact";

export type ToolDefinition<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny> = {
  name: string;
  description: string;
  input: TInput;
  output: TOutput;
  risk: ToolRisk;
  timeoutMs: number;
  requiresApproval: boolean;
  execute: (input: z.infer<TInput>, context: { userId: string; signal: AbortSignal }) => Promise<z.infer<TOutput>>;
};

const tools = new Map<string, ToolDefinition<z.ZodTypeAny, z.ZodTypeAny>>();

export function registerTool<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny>(tool: ToolDefinition<TInput, TOutput>) {
  if (tools.has(tool.name)) throw new Error(`Tool ${tool.name} is already registered.`);
  tools.set(tool.name, tool);
}

export function listTools() {
  return [...tools.values()].map(({ name, description, risk, timeoutMs, requiresApproval }) => ({ name, description, risk, timeoutMs, requiresApproval }));
}

export function getTool(name: string) {
  return tools.get(name);
}
