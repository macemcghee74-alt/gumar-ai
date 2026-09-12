import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { evolvePersonality, recordMeaningfulInteraction } from "@/lib/learning/state";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to consolidate Gunmar state." }, { status: 401 });

  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase.from("consolidation_runs").insert({
    user_id: user.id,
    status: "running",
    started_at: startedAt,
    source_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    source_end: startedAt
  }).select("id").single();
  if (runError || !run) return NextResponse.json({ error: "Unable to start consolidation run." }, { status: 503 });

  const { data: memories, error: memoryError } = await supabase.from("memories").select("id, content, importance, confidence, created_at").eq("user_id", user.id).is("superseded_at", null).order("created_at", { ascending: false }).limit(100);
  if (memoryError) {
    await supabase.from("consolidation_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_class: "memory_load" }).eq("id", run.id).eq("user_id", user.id);
    return NextResponse.json({ error: "Unable to load memories for consolidation." }, { status: 503 });
  }
  const duplicateGroups = new Map<string, typeof memories>();
  for (const memory of memories ?? []) {
    const key = memory.content.trim().toLocaleLowerCase();
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), memory]);
  }
  let superseded = 0;
  for (const group of duplicateGroups.values()) {
    if (group.length < 2) continue;
    const [keep, ...duplicates] = group.sort((a, b) => b.confidence + b.importance - (a.confidence + a.importance));
    for (const duplicate of duplicates) {
      const { error } = await supabase.from("memories").update({ superseded_by: keep.id, superseded_at: new Date().toISOString() }).eq("id", duplicate.id).eq("user_id", user.id);
      if (error) {
        await supabase.from("consolidation_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_class: "memory_supersession" }).eq("id", run.id).eq("user_id", user.id);
        return NextResponse.json({ error: "Unable to consolidate duplicate memories." }, { status: 503 });
      }
      superseded += 1;
    }
  }
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  const relationshipBefore = await supabase.from("relationships").select("interaction_count").eq("user_id", user.id).maybeSingle();
  await recordMeaningfulInteraction(supabase, user.id, { summary: `Consolidation reviewed ${memories?.length ?? 0} active memories.` });
  if ((count ?? 0) >= 3) await evolvePersonality(supabase, user.id, "reflectiveness", { value: 0.55, reason: "Repeated interaction history supports a small bounded adjustment.", sourceInteractionIds: [] });
  const { error: auditError } = await supabase.from("audit_events").insert({ user_id: user.id, event_type: "consolidation_completed", metadata: { memoriesReviewed: memories?.length ?? 0, memoriesSuperseded: superseded } });
  if (auditError) {
    await supabase.from("consolidation_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_class: "audit_write" }).eq("id", run.id).eq("user_id", user.id);
    return NextResponse.json({ error: "Unable to record consolidation audit." }, { status: 503 });
  }
  const relationshipAfter = await supabase.from("relationships").select("interaction_count").eq("user_id", user.id).maybeSingle();
  await supabase.from("consolidation_runs").update({
    status: "completed",
    finished_at: new Date().toISOString(),
    messages_examined: count ?? 0,
    memories_examined: memories?.length ?? 0,
    memories_superseded: superseded,
    relationship_changes: (relationshipAfter.data?.interaction_count ?? 0) - (relationshipBefore.data?.interaction_count ?? 0)
  }).eq("id", run.id).eq("user_id", user.id);
  return NextResponse.json({ memoriesReviewed: memories?.length ?? 0, memoriesSuperseded: superseded });
}
