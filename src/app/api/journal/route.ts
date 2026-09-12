import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const journalSchema = z.object({
  summary: z.string().trim().min(1).max(4_000),
  learned: z.string().trim().max(4_000).optional(),
  uncertainty: z.string().trim().max(4_000).optional()
});

async function requireUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to access the journal." }, { status: 401 });
  const { data, error } = await supabase.from("journal_entries").select("id, summary, learned, uncertainty, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load journal." }, { status: 503 });
  return NextResponse.json({ entries: data });
}

export async function POST(request: Request) {
  const parsed = journalSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid journal entry." }, { status: 400 });
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to write journal entries." }, { status: 401 });
  const { data, error } = await supabase.from("journal_entries").insert({ user_id: user.id, ...parsed.data }).select("id, summary, learned, uncertainty, created_at").single();
  if (error) return NextResponse.json({ error: "Unable to save journal entry." }, { status: 503 });
  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Journal entry id is required." }, { status: 400 });
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to delete journal entries." }, { status: 401 });
  const { error } = await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to delete journal entry." }, { status: 503 });
  return new Response(null, { status: 204 });
}
