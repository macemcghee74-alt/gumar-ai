import type { CodingRun, CodingTask, CodingToolCall, CodingPhase } from "@/lib/coding/types";

export type CodingToolExecutor = {
  name: string;
  risk: CodingToolCall["risk"];
  execute(input: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
};

export class CodingOrchestrator {
  private readonly tools = new Map<string, CodingToolExecutor>();

  registerTool(tool: CodingToolExecutor) {
    if (this.tools.has(tool.name)) throw new Error(`Coding tool ${tool.name} is already registered.`);
    this.tools.set(tool.name, tool);
  }

  async run(task: CodingTask, options?: { signal?: AbortSignal; providerCall?: () => Promise<void> }) {
    const startedAt = new Date().toISOString();
    const run: CodingRun = {
      task,
      phase: "understand",
      steps: 0,
      providerCalls: 0,
      toolCalls: [],
      startedAt,
      status: "running"
    };
    const deadline = Date.now() + task.maxRuntimeMs;
    try {
      for (const phase of ["understand", "inspect", "plan", "execute", "verify", "review", "complete"] as CodingPhase[]) {
        if (options?.signal?.aborted) throw new DOMException("Coding run cancelled.", "AbortError");
        if (Date.now() >= deadline || run.steps >= task.maxSteps) throw new Error("Coding run budget exhausted.");
        run.phase = phase;
        run.steps += 1;
        if (options?.providerCall && (phase === "plan" || phase === "repair")) {
          if (run.providerCalls >= task.maxProviderCalls) throw new Error("Provider-call budget exhausted.");
          await options.providerCall();
          run.providerCalls += 1;
        }
      }
      run.status = "completed";
    } catch (error) {
      run.status = options?.signal?.aborted ? "cancelled" : "failed";
      run.error = error instanceof Error ? error.message : "Coding run failed.";
    }
    run.finishedAt = new Date().toISOString();
    return run;
  }

  async executeTool(name: string, input: Record<string, unknown>, signal: AbortSignal) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown coding tool: ${name}`);
    return tool.execute(input, signal);
  }
}
