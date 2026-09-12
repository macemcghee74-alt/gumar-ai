import type { getSupabaseServerClient } from "@/lib/supabase/server";

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

const MAX_TRAIT_DELTA = 0.08;
const TRAIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function evolvePersonality(
  supabase: ServerSupabase,
  userId: string,
  trait: string,
  evidence: { value: number; reason: string; sourceInteractionIds?: string[] }
) {
  const boundedValue = Math.max(0, Math.min(1, evidence.value));
  const cutoff = new Date(Date.now() - TRAIT_COOLDOWN_MS).toISOString();
  const { data: recent } = await supabase.from("personality_history").select("id").eq("user_id", userId).eq("trait", trait).gte("created_at", cutoff).limit(1);
  if (recent && recent.length > 0) return { changed: false, reason: "cooldown" as const };

  const { data: current, error: currentError } = await supabase.from("personality_traits").select("value, evidence_count, minimum_value, maximum_value").eq("user_id", userId).eq("trait", trait).maybeSingle();
  if (currentError) throw new Error("Unable to load personality state.");
  const evidenceCount = (current?.evidence_count ?? 0) + 1;
  if (evidenceCount < 2) {
    const { error } = await supabase.from("personality_traits").upsert({ user_id: userId, trait, value: current?.value ?? 0.5, evidence_count: evidenceCount, updated_at: new Date().toISOString() });
    if (error) throw new Error("Unable to accumulate personality evidence.");
    return { changed: false, reason: "evidence_threshold" as const };
  }
  const previousValue = current?.value ?? 0.5;
  const minimum = current?.minimum_value ?? 0;
  const maximum = current?.maximum_value ?? 1;
  const target = Math.max(minimum, Math.min(maximum, boundedValue));
  const nextValue = Math.max(minimum, Math.min(maximum, previousValue + Math.max(-MAX_TRAIT_DELTA, Math.min(MAX_TRAIT_DELTA, target - previousValue))));
  if (current && nextValue === previousValue) return { changed: false, reason: "below_threshold" as const };

  const { error: traitError } = await supabase.from("personality_traits").upsert({ user_id: userId, trait, value: nextValue, evidence_count: evidenceCount, updated_at: new Date().toISOString() });
  if (traitError) throw new Error("Unable to update personality state.");
  const { error: historyError } = await supabase.from("personality_history").insert({ user_id: userId, trait, previous_value: current?.value ?? null, new_value: nextValue, delta: nextValue - previousValue, reason: evidence.reason, source_interaction_ids: evidence.sourceInteractionIds ?? [] });
  if (historyError) throw new Error("Unable to record personality history.");
  return { changed: true, previousValue, newValue: nextValue };
}

export async function recordMeaningfulInteraction(
  supabase: ServerSupabase,
  userId: string,
  options: { reliability?: number; summary?: string; communicationPreferences?: Record<string, unknown>; sharedEvent?: string }
) {
  const { data: current, error: loadError } = await supabase.from("relationships").select("familiarity, trust, interaction_count, reliability, communication_preferences, important_shared_events").eq("user_id", userId).maybeSingle();
  if (loadError) throw new Error("Unable to load relationship state.");
  const interactionCount = (current?.interaction_count ?? 0) + 1;
  const familiarity = Math.min(1, (current?.familiarity ?? 0) + 0.01);
  const reliability = Math.max(0, Math.min(1, options.reliability ?? 0.5));
  const trust = Math.max(0, Math.min(1, (current?.trust ?? 0) + (reliability - 0.5) * 0.02));
  const nextReliability = Math.max(0, Math.min(1, (current?.reliability ?? 0.5) + (reliability - (current?.reliability ?? 0.5)) * 0.1));
  const now = new Date().toISOString();
  const { error } = await supabase.from("relationships").upsert({
    user_id: userId,
    familiarity,
    trust,
    interaction_count: interactionCount,
    last_interaction_at: now,
    updated_at: now
    ,reliability: nextReliability
    ,communication_preferences: options.communicationPreferences ?? current?.communication_preferences ?? {}
    ,important_shared_events: options.sharedEvent ? [...(current?.important_shared_events ?? []), options.sharedEvent].slice(-20) : current?.important_shared_events ?? []
  });
  if (error) throw new Error("Unable to update relationship state.");
  if (options.summary) {
    const { error: eventError } = await supabase.from("relationship_events").insert({ user_id: userId, event_type: "meaningful_interaction", summary: options.summary });
    if (eventError) throw new Error("Unable to record relationship event.");
  }
  return { interactionCount, familiarity, trust };
}
