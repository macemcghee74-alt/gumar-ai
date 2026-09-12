import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["candidate", "approved", "rejected", "exported"])
});

const datasetSchema = z.object({
  action: z.literal("create_dataset_version"),
  name: z.string().trim().min(1).max(100)
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
  if (!user) return NextResponse.json({ error: "Sign in to access training data." }, { status: 401 });

  const [{ data: examples, error: examplesError }, { data: datasets, error: datasetsError }, { data: jobs, error: jobsError }] = await Promise.all([
    supabase.from("training_examples").select("id, input, output, correction, status, source, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("dataset_versions").select("id, dataset_id, version, example_count, content_hash, approval_state, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("training_jobs").select("id, dataset_version_id, provider, base_model, status, result_model, error_message, created_at, started_at, finished_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
  ]);
  if (examplesError || datasetsError || jobsError) return NextResponse.json({ error: "Unable to load training data." }, { status: 503 });
  return NextResponse.json({ examples, datasets, jobs });
}

export async function PATCH(request: Request) {
  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid training candidate update." }, { status: 400 });
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to review training candidates." }, { status: 401 });

  const { data, error } = await supabase.from("training_examples").update({
    status: parsed.data.status,
    approved: parsed.data.status === "approved"
  }).eq("id", parsed.data.id).eq("user_id", user.id).select("id, status, approved").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to update training candidate." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Training candidate not found." }, { status: 404 });
  return NextResponse.json({ example: data });
}

export async function POST(request: Request) {
  const parsed = datasetSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Only approved dataset version creation is available." }, { status: 400 });
  const { supabase, user } = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Sign in to create datasets." }, { status: 401 });

  const { data: examples, error: examplesError } = await supabase
    .from("training_examples")
    .select("id, input, output, correction")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  if (examplesError) return NextResponse.json({ error: "Unable to load approved examples." }, { status: 503 });
  if (!examples || examples.length === 0) return NextResponse.json({ error: "Approve at least one training candidate first." }, { status: 400 });

  const payload = JSON.stringify(examples);
  const hash = createHash("sha256").update(payload).digest("hex");
  const { data: dataset, error: datasetError } = await supabase.from("training_datasets").insert({
    user_id: user.id,
    name: parsed.data.name,
    status: "draft"
  }).select("id").single();
  if (datasetError) return NextResponse.json({ error: "Unable to create dataset." }, { status: 503 });

  const { data: previous } = await supabase.from("dataset_versions").select("version").eq("dataset_id", dataset.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: version, error: versionError } = await supabase.from("dataset_versions").insert({
    user_id: user.id,
    dataset_id: dataset.id,
    version: (previous?.version ?? 0) + 1,
    example_count: examples.length,
    content_hash: hash,
    approval_state: "draft"
  }).select("id, dataset_id, version, example_count, content_hash, approval_state, created_at").single();
  if (versionError) return NextResponse.json({ error: "Unable to create dataset version." }, { status: 503 });
  return NextResponse.json({ dataset: version }, { status: 201 });
}
