import { NextResponse } from "next/server";
import { CerebrasProvider, GroqProvider, OpenRouterProvider, AIProviderError } from "@/lib/ai/provider";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function diagnoseProvider(provider: CerebrasProvider | GroqProvider | OpenRouterProvider) {
  const startedAt = Date.now();
  if (!provider.configured) return { configured: false, model: provider.model, success: false, latencyMs: 0, errorCode: "MISSING_KEY" };
  try {
    const result = await provider.streamReply({ message: "Reply exactly OK", messages: [
      { role: "system", content: "You are Gunmar." },
      { role: "user", content: "Reply exactly OK" }
    ] });
    const reader = result.stream.getReader();
    const firstToken = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("FIRST_TOKEN_TIMEOUT")), 8_000))
    ]);
    await reader.cancel();
    return { configured: true, model: provider.model, success: !firstToken.done && Boolean(firstToken.value?.byteLength), latencyMs: Date.now() - startedAt, status: 200 };
  } catch (error) {
    const providerError = error instanceof AIProviderError ? error : null;
    return {
      configured: true,
      model: provider.model,
      success: false,
      latencyMs: Date.now() - startedAt,
      status: providerError?.status,
      errorCode: providerError?.code ?? (error instanceof Error && error.message === "FIRST_TOKEN_TIMEOUT" ? "timeout" : "network")
    };
  }
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to diagnose providers." }, { status: 401 });
  const [groq, cerebras, openrouter] = await Promise.all([
    diagnoseProvider(new GroqProvider()),
    diagnoseProvider(new CerebrasProvider()),
    diagnoseProvider(new OpenRouterProvider())
  ]);
  return NextResponse.json({ groq, cerebras, openrouter }, { headers: { "cache-control": "no-store" } });
}