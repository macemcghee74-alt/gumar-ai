import { describe, expect, it } from "vitest";
import { deduplicateCandidates, extractMemoryCandidates, scoreMemory } from "@/lib/memory/engine";

describe("memory engine", () => {
  it("scores and clamps memory candidates", () => {
    expect(scoreMemory({ importance: 1, confidence: 1 })).toBe(1);
    expect(scoreMemory({ importance: 5, confidence: 5 })).toBe(1);
    expect(scoreMemory({ importance: -1, confidence: -1 })).toBe(0);
  });

  it("deduplicates case and whitespace variants", () => {
    expect(deduplicateCandidates([
      { content: "dark roast", memoryType: "preference", importance: 0.5, confidence: 0.5 },
      { content: " Dark Roast ", memoryType: "preference", importance: 0.9, confidence: 0.9 }
    ])).toHaveLength(1);
  });

  it("preserves assertions and rejects negations and questions", () => {
    const [candidate] = extractMemoryCandidates("I prefer dark roast coffee");
    expect(candidate?.content.toLowerCase()).toContain("prefer");
    expect(extractMemoryCandidates("I don't like cilantro")).toHaveLength(0);
    expect(extractMemoryCandidates("Do you think I like jazz?")).toHaveLength(0);
  });

  it("captures repeated facts", () => {
    expect(extractMemoryCandidates("I prefer tabs. I prefer dark mode.")).toHaveLength(2);
  });
});
