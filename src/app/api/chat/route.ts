import { NextResponse } from "next/server";
import { AIProviderError, chatInputSchema, getAIProvider } from "@/lib/ai/provider";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { clientKey, consumeRateLimit, readJson } from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rate = consumeRateLimit(`chat:${clientKey(request)}`);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "retry-after": String(rate.retryAfter) } });

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const parsed = chatInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Message must be between 1 and 12,000 characters." }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseServerClient();
    let userId: string | null = null;
    let conversationId = parsed.data.conversationId;

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Sign in to save conversations." }, { status: 401 });
      userId = user.id;

      if (conversationId) {
        const { data: conversation } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
        if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      } else {
        const { data: conversation, error } = await supabase.from("conversations").insert({ user_id: user.id }).select("id").single();
        if (error) throw new Error("Unable to create conversation.");
        conversationId = conversation.id;
      }

      const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: parsed.data.message });
      if (error) throw new Error("Unable to save message.");

      if (!parsed.data.conversationId) {
        const title = parsed.data.message.trim().slice(0, 80);
        const { error: titleError } = await supabase.from("conversations").update({ title }).eq("id", conversationId).eq("user_id", user.id);
        if (titleError) throw new Error("Unable to update conversation.");
      }
    }

    const result = await getAIProvider().streamReply(parsed.data, { signal: request.signal });
    const stream = result.stream;
    const reader = stream.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let assistantContent = "";
    const responseStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const chunk = await reader.read();
        if (chunk.done) {
          if (supabase && userId && conversationId && assistantContent) {
            const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: assistantContent });
            if (error) console.error("Unable to persist assistant response.", error);
            const { error: conversationError } = await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", userId);
            if (conversationError) console.error("Unable to update conversation timestamp.", conversationError);
          }
          controller.close();
          return;
        }
        const text = decoder.decode(chunk.value, { stream: true });
        assistantContent += text;
        controller.enqueue(encoder.encode(text));
      }
    });
    return new Response(responseStream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache", ...(conversationId ? { "x-conversation-id": conversationId } : {}) } });
  } catch (error) {
    if (error instanceof AIProviderError && error.code === "configuration") {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Unable to contact the AI provider.";
    const status = error instanceof AIProviderError && error.code === "rate_limit" ? 429 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
