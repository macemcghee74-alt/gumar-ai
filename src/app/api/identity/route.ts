import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to access Gunmar identity." }, { status: 401 });

  const { data, error } = await supabase
    .from("gunmar_identity")
    .select("name, created_at, identity_version, current_model_version, behavioral_principles, long_term_goals, stable_preferences")
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load Gunmar identity." }, { status: 503 });
  return NextResponse.json({ identity: data });
}
