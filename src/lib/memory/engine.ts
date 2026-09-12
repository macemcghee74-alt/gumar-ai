import type { Tables } from "@/lib/supabase/database.types";

export type MemoryRow = Tables<"memories">;

export type MemoryCandidate = {
  content: string;
  memoryType: MemoryRow["memory_type"];
  importance: number;
  confidence: number;
};

export function scoreMemory(candidate: Pick<MemoryCandidate, "importance" | "confidence">) {
  return Math.min(1, Math.max(0, candidate.importance * 0.6 + candidate.confidence * 0.4));
}

export function deduplicateCandidates(candidates: MemoryCandidate[]) {
  const unique = new Map<string, MemoryCandidate>();
  for (const candidate of candidates) {
    const key = candidate.content.trim().toLocaleLowerCase();
    if (!key) continue;
    const existing = unique.get(key);
    if (!existing || scoreMemory(candidate) > scoreMemory(existing)) unique.set(key, candidate);
  }
  return [...unique.values()];
}

export function extractMemoryCandidates(text: string): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];
  const patterns: Array<{ pattern: RegExp; memoryType: MemoryCandidate["memoryType"]; importance: number }> = [
    { pattern: /\bI prefer ([^.?!]+)/i, memoryType: "preference", importance: 0.8 },
    { pattern: /\bI(?:'m| am) working on ([^.?!]+)/i, memoryType: "project", importance: 0.75 },
    { pattern: /\bRemember that ([^.?!]+)/i, memoryType: "semantic", importance: 0.9 },
    { pattern: /\bI like ([^.?!]+)/i, memoryType: "semantic", importance: 0.65 }
  ];

  for (const { pattern, memoryType, importance } of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      candidates.push({
        content: match[1].trim(),
        memoryType,
        importance,
        confidence: 0.65
      });
    }
  }
  return deduplicateCandidates(candidates);
}
