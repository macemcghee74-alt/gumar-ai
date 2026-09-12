import type { Tables } from "@/lib/supabase/database.types";

export type MemoryRow = Tables<"memories">;

export type MemoryCandidate = {
  content: string;
  memoryType: MemoryRow["memory_type"];
  importance: number;
  confidence: number;
};

export const MAX_MEMORY_CONTENT_LENGTH = 240;

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

const NEGATION = /\b(?:not|never|no longer|hardly|rarely|hate|hated|dislike|disliked|avoid|stopped|used to)\b|n['\u2019]t\b/i;
const NON_ASSERTIVE = /\b(?:if|would|might|maybe|perhaps|suppose|imagine|someone|people|they say)\b/i;
const RULES = [
  { pattern: /\bremember that\s+(.+)/gi, memoryType: "semantic" as const, importance: 0.9, confidence: 0.8, render: (value: string) => value },
  { pattern: /\bI\s+prefer\s+(.+)/gi, memoryType: "preference" as const, importance: 0.8, confidence: 0.7, render: (value: string) => `prefers ${value}` },
  { pattern: /\bI(?:['\u2019]m|\s+am)\s+working\s+on\s+(.+)/gi, memoryType: "project" as const, importance: 0.75, confidence: 0.7, render: (value: string) => `is working on ${value}` },
  { pattern: /\bI\s+(?:like|love|enjoy)\s+(.+)/gi, memoryType: "semantic" as const, importance: 0.65, confidence: 0.6, render: (value: string) => `likes ${value}` }
];

function cleanObject(raw: string) {
  return raw.replace(/[.!?,;:]+$/, "").replace(/\s+/g, " ").trim().slice(0, MAX_MEMORY_CONTENT_LENGTH);
}

function isAssertion(sentence: string) {
  return !sentence.endsWith("?") && !NEGATION.test(sentence) && !NON_ASSERTIVE.test(sentence);
}

function sentences(text: string) {
  return text.split(/(?<=[.!?])\s+/).map((value) => value.trim()).filter(Boolean);
}

export function extractMemoryCandidates(text: string): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];
  for (const sentence of sentences(text)) {
    if (!isAssertion(sentence)) continue;
    for (const rule of RULES) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      for (const match of sentence.matchAll(pattern)) {
        const object = cleanObject(match[1] ?? "");
        if (object.length < 2) continue;
        candidates.push({
          content: cleanObject(rule.render(object)),
          memoryType: rule.memoryType,
          importance: rule.importance,
          confidence: rule.confidence
        });
      }
    }
  }
  return deduplicateCandidates(candidates);
}
