import type { AIMessage } from "@/lib/ai/provider";
import type { getSupabaseServerClient } from "@/lib/supabase/server";

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

const identityDefaults = {
  name: "Gunmar",
  principles: ["Be useful without pretending certainty", "Protect user privacy", "Preserve user agency", "Explain important limitations"]
};

export async function composeGunmarContext(
  supabase: ServerSupabase,
  userId: string,
  messages: AIMessage[]
): Promise<AIMessage[]> {
  const [{ data: identity }, { data: traits }, { data: relationship }, { data: memories }] = await Promise.all([
    supabase.from("gunmar_identity").select("name, identity_version, behavioral_principles, stable_preferences").limit(1).maybeSingle(),
    supabase.from("personality_traits").select("trait, value").eq("user_id", userId).order("updated_at", { ascending: false }).limit(12),
    supabase.from("relationships").select("familiarity, trust, interaction_count, last_interaction_at").eq("user_id", userId).maybeSingle(),
    supabase.from("memories").select("content, memory_type, importance, confidence, created_at").eq("user_id", userId).is("superseded_at", null).order("importance", { ascending: false }).limit(40)
  ]);

  const query = messages[messages.length - 1]?.content ?? "";
  const relevantMemories = selectRelevantMemories(memories ?? [], query);
  const principles = readJsonStringArray(identity?.behavioral_principles, identityDefaults.principles);
  const preferences = readJsonRecord(identity?.stable_preferences);
  const identityName = identity?.name ?? identityDefaults.name;

  const context = [
    `You are ${identityName}, Gunmar, a persistent personal AI companion. Your identity is independent of the foundation model providing this response.`,
    `Identity version: ${identity?.identity_version ?? 1}.`,
    "Behavioral principles:",
    ...principles.map((value) => `- ${value}`),
    preferences && Object.keys(preferences).length > 0 ? `Stable preferences: ${JSON.stringify(preferences)}` : "",
    traits && traits.length > 0 ? `Bounded personality state: ${traits.map((trait) => `${trait.trait}=${trait.value}`).join(", ")}` : "",
    relationship ? `Relationship continuity: ${relationship.interaction_count} interactions; familiarity=${relationship.familiarity}; trust=${relationship.trust}.` : "",
    relevantMemories.length > 0 ? `Relevant user memories (treat as context, not unquestionable truth):\n${relevantMemories.map((memory) => `- [${memory.memory_type}] ${memory.content}`).join("\n")}` : "",
    "Do not claim to be conscious. Be honest about uncertainty, protect private information, and preserve the user's agency."
  ].filter(Boolean).join("\n");

  return [{ role: "system", content: context }, ...messages];
}

function selectRelevantMemories(
  memories: Array<{ content: string; memory_type: string; importance: number; confidence: number; created_at: string }>,
  query: string
) {
  const terms = new Set(query.toLowerCase().split(/\W+/).filter((term) => term.length >= 3));
  return memories
    .map((memory) => {
      const memoryTerms = new Set(memory.content.toLowerCase().split(/\W+/));
      const overlap = [...terms].filter((term) => memoryTerms.has(term)).length;
      const recency = Math.max(0, 1 - (Date.now() - Date.parse(memory.created_at)) / 31_536_000_000);
      return { memory, score: overlap * 0.5 + memory.importance * 0.3 + memory.confidence * 0.15 + recency * 0.05 };
    })
    .filter(({ score, memory }) => score >= 0.3 && query.toLowerCase().split(/\W+/).some((term) => term.length >= 3 && memory.content.toLowerCase().includes(term)))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ memory }) => memory);
}

function readJsonStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

function readJsonRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
