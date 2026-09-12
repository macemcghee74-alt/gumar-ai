import { NextResponse } from "next/server";
import { z } from "zod";
import { createMemorySchema } from "@/lib/memory/schema";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getEmbeddingProvider } from "@/lib/embeddings/provider";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

async function embeddingFor(content: string) {
  const provider = getEmbeddingProvider();
  if (!provider.configured) return null;
  const result = await provider.embed(content);
  return `[${result.vector.join(",")}]`;
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to access memories." }, { status: 401 });

  const { data, error } = await supabase
    .from("memories")
    .select("id, content, memory_type, importance, confidence, created_at, last_accessed_at, access_count")
    .eq("user_id", user.id)
    .is("superseded_at", null)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Unable to load memories." }, { status: 503 });
  return NextResponse.json({ memories: data });
}

export async function POST(request: Request) {
  const parsed = createMemorySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid memory payload." }, { status: 400 });

  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to save memories." }, { status: 401 });

  const embedding = await embeddingFor(parsed.data.content);
  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: user.id,
      content: parsed.data.content,
      memory_type: parsed.data.memoryType,
      importance: parsed.data.importance,
      confidence: parsed.data.confidence,
      embedding
    })
    .select("id, content, memory_type, importance, confidence, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Unable to save memory." }, { status: 503 });
  return NextResponse.json({ memory: data }, { status: 201 });
}

const correctionSchema = z.object({
  id: z.string().uuid(),
  content: z.string().trim().min(1).max(4_000),
  memoryType: z.enum(["semantic", "episodic", "preference", "relationship", "project"]),
  importance: z.number().min(0).max(1).default(0.5),
  confidence: z.number().min(0).max(1).default(0.8)
});

export async function PATCH(request: Request) {
  const parsed = correctionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid memory correction." }, { status: 400 });

  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to correct memories." }, { status: 401 });

  const { data: original, error: originalError } = await supabase
    .from("memories")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .is("superseded_at", null)
    .maybeSingle();
  if (originalError) return NextResponse.json({ error: "Unable to load memory." }, { status: 503 });
  if (!original) return NextResponse.json({ error: "Memory not found." }, { status: 404 });

  const embedding = await embeddingFor(parsed.data.content);
  const { data: replacement, error: insertError } = await supabase
    .from("memories")
    .insert({
      user_id: user.id,
      content: parsed.data.content,
      memory_type: parsed.data.memoryType,
      importance: parsed.data.importance,
      confidence: parsed.data.confidence,
      embedding
    })
    .select("id, content, memory_type, importance, confidence, created_at")
    .single();
  if (insertError) return NextResponse.json({ error: "Unable to save corrected memory." }, { status: 503 });

  const { error: supersedeError } = await supabase
    .from("memories")
    .update({ superseded_by: replacement.id, superseded_at: new Date().toISOString() })
    .eq("id", original.id)
    .eq("user_id", user.id);
  if (supersedeError) return NextResponse.json({ error: "Unable to supersede original memory." }, { status: 503 });
  return NextResponse.json({ memory: replacement });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Memory id is required." }, { status: 400 });

  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to delete memories." }, { status: 401 });

  const query = supabase.from("memories").delete().eq("user_id", user.id);
  const { error } = id === "all" ? await query : await query.eq("id", id);
  if (error) return NextResponse.json({ error: "Unable to delete memory." }, { status: 503 });
  return new Response(null, { status: 204 });
}
