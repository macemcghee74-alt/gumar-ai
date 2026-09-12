import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { resolveWorkspacePath, authorizeCodingTool } from "@/lib/coding/policy";
import type { CodingToolExecutor } from "@/lib/coding/orchestrator";

const execFileAsync = promisify(execFile);
const verificationCommands = new Map([
  ["tests", ["npm", ["test"]]],
  ["typecheck", ["npm", ["run", "typecheck"]]],
  ["lint", ["npm", ["run", "lint"]]],
  ["build", ["npm", ["run", "build"]]]
] as const);

function bounded(value: string, max = 20_000) {
  return value.length > max ? `${value.slice(0, max)}\n[truncated]` : value;
}

export function createRepositoryCodingTools(workspaceRoot: string): CodingToolExecutor[] {
  const file = (name: string, risk: CodingToolExecutor["risk"], execute: CodingToolExecutor["execute"]): CodingToolExecutor => ({ name, risk, execute });
  return [
    file("read_file", "read", async (input) => bounded(await fs.readFile(resolveWorkspacePath(workspaceRoot, String(input.path)), "utf8"))),
    file("read_range", "read", async (input) => {
      const lines = (await fs.readFile(resolveWorkspacePath(workspaceRoot, String(input.path)), "utf8")).split(/\r?\n/);
      const start = Math.max(1, Number(input.startLine) || 1);
      const end = Math.min(lines.length, Number(input.endLine) || start);
      return bounded(lines.slice(start - 1, end).join("\n"));
    }),
    file("list_directory", "read", async (input) => {
      const entries = await fs.readdir(resolveWorkspacePath(workspaceRoot, String(input.path ?? ".")), { withFileTypes: true });
      return entries.slice(0, 200).map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : "file" }));
    }),
    file("git_status", "read", async () => bounded((await execFileAsync("git", ["status", "--short"], { cwd: path.resolve(workspaceRoot), maxBuffer: 1_000_000 })).stdout)),
    file("git_diff", "read", async () => bounded((await execFileAsync("git", ["diff", "--no-ext-diff"], { cwd: path.resolve(workspaceRoot), maxBuffer: 2_000_000 })).stdout)),
    file("git_log", "read", async () => bounded((await execFileAsync("git", ["log", "--oneline", "-20"], { cwd: path.resolve(workspaceRoot), maxBuffer: 1_000_000 })).stdout)),
    ...[...verificationCommands.entries()].map(([name, [command, args]]) => file(`run_${name}`, "verify", async (_input, signal) => {
      authorizeCodingTool("verify");
      const result = await execFileAsync(command, args, { cwd: path.resolve(workspaceRoot), signal, maxBuffer: 2_000_000 });
      return { stdout: bounded(result.stdout), stderr: bounded(result.stderr) };
    }))
  ];
}
