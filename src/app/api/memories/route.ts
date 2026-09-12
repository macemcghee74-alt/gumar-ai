import { NextResponse } from "next/server";
import { createMemorySchema } from "@/lib/memory/schema";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
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

  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: user.id,
      content: parsed.data.content,
      memory_type: parsed.data.memoryType,
      importance: parsed.data.importance,
      confidence: parsed.data.confidence
    })
    .select("id, content, memory_type, importance, confidence, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Unable to save memory." }, { status: 503 });
  return NextResponse.json({ memory: data }, { status: 201 });
}
