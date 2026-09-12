import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["promote", "rollback", "reject"])
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
  if (!user) return NextResponse.json({ error: "Sign in to access model versions." }, { status: 401 });
  const [{ data: models, error: modelError }, { data: evaluations, error: evaluationError }] = await Promise.all([
    supabase.from("model_versions").select("id, provider, model_name, base_model, version, status, dataset_version_id, training_provider, training_job_id, promoted_at, rollback_target, created_at").order("created_at", { ascending: false }),
    supabase.from("model_evaluations").select("id, model_version_id, suite, category, score, notes, metadata, created_at").or(`user_id.is.null,user_id.eq.${user.id}`).order("created_at", { ascending: false })
  ]);
  if (modelError || evaluationError) return NextResponse.json({ error: "Unable to load model lifecycle data." }, { status: 503 });
  return NextResponse.json({ models, evaluations });
}

export async function POST(request: Request) {
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid model lifecycle action." }, { status: 400 });
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to manage model versions." }, { status: 401 });

  const { data: target, error: targetError } = await supabase.from("model_versions").select("id, status, version, provider, model_name, rollback_target").eq("id", parsed.data.id).maybeSingle();
  if (targetError) return NextResponse.json({ error: "Unable to load model version." }, { status: 503 });
  if (!target) return NextResponse.json({ error: "Model version not found." }, { status: 404 });
  if (parsed.data.action === "promote") {
    if (target.status !== "candidate") return NextResponse.json({ error: "Only candidate models can be promoted." }, { status: 409 });
    const { data: active } = await supabase.from("model_versions").select("id").eq("status", "active").limit(1).maybeSingle();
    if (active) await supabase.from("model_versions").update({ status: "retired" }).eq("id", active.id);
    const { data, error } = await supabase.from("model_versions").update({ status: "active", promoted_at: new Date().toISOString(), rollback_target: active?.id ?? null }).eq("id", target.id).select().single();
    if (error) return NextResponse.json({ error: "Unable to promote model version." }, { status: 503 });
    return NextResponse.json({ model: data });
  }
  if (parsed.data.action === "reject") {
    if (target.status !== "candidate") return NextResponse.json({ error: "Only candidate models can be rejected." }, { status: 409 });
    const { data, error } = await supabase.from("model_versions").update({ status: "rejected" }).eq("id", target.id).select().single();
    if (error) return NextResponse.json({ error: "Unable to reject model version." }, { status: 503 });
    return NextResponse.json({ model: data });
  }
  if (target.status !== "active") return NextResponse.json({ error: "Only the active model can be rolled back." }, { status: 409 });
  if (!target.rollback_target) return NextResponse.json({ error: "Rollback target is unavailable." }, { status: 409 });
  const { data: previous } = await supabase.from("model_versions").select("id, status").eq("id", target.rollback_target).maybeSingle();
  if (!previous) return NextResponse.json({ error: "Rollback target is unavailable." }, { status: 409 });
  await supabase.from("model_versions").update({ status: "retired" }).eq("id", target.id);
  const { data, error } = await supabase.from("model_versions").update({ status: "active", promoted_at: new Date().toISOString() }).eq("id", previous.id).select().single();
  if (error) return NextResponse.json({ error: "Unable to roll back model version." }, { status: 503 });
  return NextResponse.json({ model: data });
}
