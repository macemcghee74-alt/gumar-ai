import path from "node:path";
import type { CodingToolRisk } from "@/lib/coding/types";

const SECRET_PATHS = new Set([".env", ".env.local", ".env.example"]);

export function resolveWorkspacePath(workspaceRoot: string, requestedPath: string) {
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, requestedPath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("Path escapes the authorized workspace.");
  const relative = path.relative(root, resolved);
  if (SECRET_PATHS.has(relative) || relative.startsWith(".env.") || relative.includes(`${path.sep}.ssh${path.sep}`)) {
    throw new Error("Access to secret files is blocked.");
  }
  return resolved;
}

export function authorizeCodingTool(risk: CodingToolRisk, approved = false) {
  if (risk === "destructive" && !approved) throw new Error("Destructive coding tools require explicit approval.");
  if (risk === "network" && !approved) throw new Error("Network coding tools require explicit approval.");
  return true;
}
