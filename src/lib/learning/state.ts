import type { getSupabaseServerClient } from "@/lib/supabase/server";

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

const MAX_TRAIT_DELTA = 0.08;
const TRAIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function evolvePersonality(
  supabase: ServerSupabase,
  userId: string,
  trait: string,
  evidence: { value: number; reason: string }
) {
  const boundedValue = Math.max(0, Math.min(1, evidence.value));
  const cutoff = new Date(Date.now() - TRAIT_COOLDOWN_MS).toISOString();
  const { data: recent } = await supabase.from("personality_history").select("id").eq("user_id", userId).eq("trait", trait).gte("created_at", cutoff).limit(1);
  if (recent && recent.length > 0) return { changed: false, reason: "cooldown" as const };

  const { data: current, error: currentError } = await supabase.from("personality_traits").select("value").eq("user_id", userId).eq("trait", trait).maybeSingle();
  if (currentError) throw new Error("Unable to load personality state.");
  const previousValue = current?.value ?? boundedValue;
  const nextValue = current ? previousValue + Math.max(-MAX_TRAIT_DELTA, Math.min(MAX_TRAIT_DELTA, boundedValue - previousValue)) : previousValue;
  if (current && nextValue === previousValue) return { changed: false, reason: "below_threshold" as const };

  const { error: traitError } = await supabase.from("personality_traits").upsert({ user_id: userId, trait, value: nextValue, updated_at: new Date().toISOString() });
  if (traitError) throw new Error("Unable to update personality state.");
  const { error: historyError } = await supabase.from("personality_history").insert({ user_id: userId, trait, previous_value: current?.value ?? null, new_value: nextValue, reason: evidence.reason });
  if (historyError) throw new Error("Unable to record personality history.");
  return { changed: true, previousValue, newValue: nextValue };
}

export async function recordMeaningfulInteraction(
  supabase: ServerSupabase,
  userId: string,
  options: { reliability?: number; summary?: string }
) {
  const { data: current, error: loadError } = await supabase.from("relationships").select("familiarity, trust, interaction_count").eq("user_id", userId).maybeSingle();
  if (loadError) throw new Error("Unable to load relationship state.");
  const interactionCount = (current?.interaction_count ?? 0) + 1;
  const familiarity = Math.min(1, (current?.familiarity ?? 0) + 0.01);
  const reliability = Math.max(0, Math.min(1, options.reliability ?? 0.5));
  const trust = Math.max(0, Math.min(1, (current?.trust ?? 0) + (reliability - 0.5) * 0.02));
  const now = new Date().toISOString();
  const { error } = await supabase.from("relationships").upsert({
    user_id: userId,
    familiarity,
    trust,
    interaction_count: interactionCount,
    last_interaction_at: now,
    updated_at: now
  });
  if (error) throw new Error("Unable to update relationship state.");
  if (options.summary) {
    const { error: eventError } = await supabase.from("relationship_events").insert({ user_id: userId, event_type: "meaningful_interaction", summary: options.summary });
    if (eventError) throw new Error("Unable to record relationship event.");
  }
  return { interactionCount, familiarity, trust };
}
