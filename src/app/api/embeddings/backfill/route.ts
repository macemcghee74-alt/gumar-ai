import { NextResponse } from "next/server";
import { getEmbeddingProvider } from "@/lib/embeddings/provider";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to backfill memories." }, { status: 401 });
  const provider = getEmbeddingProvider();
  if (!provider.configured) return NextResponse.json({ error: "Embedding provider is not configured." }, { status: 503 });
  const payload = await request.json().catch(() => ({})) as { batchSize?: number };
  const batchSize = Number.isInteger(payload.batchSize) && payload.batchSize && payload.batchSize > 0 ? Math.min(payload.batchSize, 25) : 10;
  const { data: memories, error: loadError } = await supabase
    .from("memories")
    .select("id, content")
    .eq("user_id", user.id)
    .is("superseded_at", null)
    .is("embedding", null)
    .limit(batchSize);
  if (loadError) return NextResponse.json({ error: "Unable to load pending memories." }, { status: 503 });

  let embedded = 0;
  for (const memory of memories ?? []) {
    const result = await provider.embed(memory.content);
    const { error } = await supabase.from("memories").update({
      embedding: `[${result.vector.join(",")}]`,
      embedding_provider: result.provider,
      embedding_model: result.model,
      embedding_dimensions: result.dimensions,
      embedded_at: new Date().toISOString(),
      embedding_version: result.version
    }).eq("id", memory.id).eq("user_id", user.id).is("embedding", null);
    if (error) return NextResponse.json({ error: "Embedding backfill stopped before completion.", embedded, failed: 1 }, { status: 503 });
    embedded += 1;
  }

  const { count: pending } = await supabase.from("memories").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("superseded_at", null).is("embedding", null);
  return NextResponse.json({ embedded, pending: pending ?? 0, model: provider.model, dimensions: provider.dimensions });
}
