import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to access coding runs." }, { status: 401 });
  const { id } = await params;
  const { data: run, error } = await supabase.from("coding_runs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load coding run." }, { status: 503 });
  if (!run) return NextResponse.json({ error: "Coding run not found." }, { status: 404 });
  const { data: steps, error: stepsError } = await supabase.from("coding_steps").select("id, step_number, phase, tool, safe_arguments_summary, result_status, duration_ms, created_at").eq("run_id", id).eq("user_id", user.id).order("step_number", { ascending: true });
  if (stepsError) return NextResponse.json({ error: "Unable to load coding steps." }, { status: 503 });
  return NextResponse.json({ run, steps });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to cancel coding runs." }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabase.from("coding_runs").update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).in("status", ["queued", "planning", "running", "verifying", "waiting_for_approval"]).select("id, status").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to cancel coding run." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Coding run is not cancellable." }, { status: 409 });
  return NextResponse.json({ run: data });
}
