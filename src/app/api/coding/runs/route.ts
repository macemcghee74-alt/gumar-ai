import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const createRunSchema = z.object({
  repositoryId: z.string().trim().min(1).max(200),
  task: z.string().trim().min(1).max(4_000),
  maxSteps: z.number().int().min(1).max(100).optional(),
  maxProviderCalls: z.number().int().min(0).max(20).optional(),
  tokenBudget: z.number().int().min(1_000).max(100_000).nullable().optional()
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
  if (!user) return NextResponse.json({ error: "Sign in to access coding runs." }, { status: 401 });
  const { data, error } = await supabase.from("coding_runs").select("id, repository_id, task, status, phase, steps_used, max_steps, provider_calls_used, max_provider_calls, last_error, result_summary, created_at, started_at, finished_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Unable to load coding runs." }, { status: 503 });
  return NextResponse.json({ runs: data });
}

export async function POST(request: Request) {
  const parsed = createRunSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid coding run." }, { status: 400 });
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to create coding runs." }, { status: 401 });
  const { data, error } = await supabase.from("coding_runs").insert({
    user_id: user.id,
    repository_id: parsed.data.repositoryId,
    task: parsed.data.task,
    status: "queued",
    phase: "understand",
    max_steps: parsed.data.maxSteps ?? 30,
    max_provider_calls: parsed.data.maxProviderCalls ?? 8,
    token_budget: parsed.data.tokenBudget ?? null
  }).select("id, repository_id, task, status, phase, created_at").single();
  if (error) return NextResponse.json({ error: "Unable to create coding run." }, { status: 503 });
  return NextResponse.json({ run: data }, { status: 201 });
}
