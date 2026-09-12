import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assetPath, validateUpload } from "@/lib/security/files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload files." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload." }, { status: 400 });
  }
  const file = form.get("file");
  const bucket = form.get("bucket");
  if (!(file instanceof File) || (bucket !== "uploads" && bucket !== "audio")) return NextResponse.json({ error: "A supported file and bucket are required." }, { status: 400 });
  try {
    validateUpload(file);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid file." }, { status: 400 });
  }
  const path = assetPath(user.id, file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: "Unable to store upload." }, { status: 503 });
  const { data: asset, error: assetError } = await supabase.from("generated_assets").insert({
    user_id: user.id,
    storage_path: path,
    asset_type: file.type.startsWith("audio/") ? "audio" : "image",
    metadata: { mimeType: file.type, size: file.size, bucket }
  }).select("id, storage_path, asset_type, metadata, created_at").single();
  if (assetError) return NextResponse.json({ error: "Upload stored but metadata could not be recorded." }, { status: 503 });
  return NextResponse.json({ asset }, { status: 201 });
}
