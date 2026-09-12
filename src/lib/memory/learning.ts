import type { getSupabaseServerClient } from "@/lib/supabase/server";
import { extractMemoryCandidates } from "@/lib/memory/engine";
import { getEmbeddingProvider } from "@/lib/embeddings/provider";

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

export async function learnFromUserMessage(
  supabase: ServerSupabase,
  userId: string,
  message: string,
  sourceMessageId?: string
) {
  const candidates = extractMemoryCandidates(message);
  if (candidates.length === 0) return;
  const embeddingProvider = getEmbeddingProvider();

  for (const candidate of candidates) {
    const { data: existing, error: lookupError } = await supabase
      .from("memories")
      .select("id, importance, confidence")
      .eq("user_id", userId)
      .eq("content", candidate.content)
      .is("superseded_at", null)
      .maybeSingle();
    if (lookupError) throw new Error("Unable to check existing memories.");
    if (existing) {
      if (candidate.importance <= existing.importance && candidate.confidence <= existing.confidence) continue;
      const { error } = await supabase.from("memories").update({
        importance: Math.max(candidate.importance, existing.importance),
        confidence: Math.max(candidate.confidence, existing.confidence)
      }).eq("id", existing.id).eq("user_id", userId);
      if (error) throw new Error("Unable to strengthen existing memory.");
      continue;
    }

    const embedding = embeddingProvider.configured ? await embeddingProvider.embed(candidate.content) : undefined;
    const { error } = await supabase.from("memories").insert({
      user_id: userId,
      content: candidate.content,
      memory_type: candidate.memoryType,
      importance: candidate.importance,
      confidence: candidate.confidence,
      source_message_id: sourceMessageId ?? null,
      embedding: embedding ? `[${embedding.vector.join(",")}]` : null
    });
    if (error) throw new Error("Unable to save learned memory.");
  }
}
