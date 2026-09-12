import { NextResponse } from "next/server";
import { AIMessage, AIProviderError, chatInputSchema, getAIProvider } from "@/lib/ai/provider";
import { composeGunmarContext } from "@/lib/ai/context";
import { learnFromUserMessage } from "@/lib/memory/learning";
import { extractMemoryCandidates } from "@/lib/memory/engine";
import { recordMeaningfulInteraction } from "@/lib/learning/state";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { readJson } from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    let userMessageId: string | undefined;

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Sign in to save conversations." }, { status: 401 });
      userId = user.id;
      const limit = Number(process.env.GUNMAR_CHAT_RATE_LIMIT ?? 30);
      const windowSeconds = Number(process.env.GUNMAR_CHAT_RATE_WINDOW_SECONDS ?? 60);
      const { data: rateRows, error: rateError } = await supabase.rpc("consume_rate_limit", {
        p_scope: "chat",
        p_limit: Number.isInteger(limit) && limit > 0 ? limit : 30,
        p_window_seconds: Number.isInteger(windowSeconds) && windowSeconds > 0 ? windowSeconds : 60
      });
      if (rateError) throw new Error("Unable to verify request rate limit.");
      const rate = rateRows?.[0];
      if (!rate?.allowed) {
        return NextResponse.json({ error: "Too many requests." }, {
          status: 429,
          headers: { "retry-after": String(rate?.retry_after ?? 60) }
        });
      }

      if (conversationId) {
        const { data: conversation } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
        if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      } else {
        const { data: conversation, error } = await supabase.from("conversations").insert({ user_id: user.id }).select("id").single();
        if (error) throw new Error("Unable to create conversation.");
        conversationId = conversation.id;
      }

      const { data: savedUserMessage, error } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: parsed.data.message }).select("id").single();
      if (error) throw new Error("Unable to save message.");
      if (!savedUserMessage) throw new Error("Unable to identify saved message.");
      userMessageId = savedUserMessage.id;

      if (!parsed.data.conversationId) {
        const title = parsed.data.message.trim().slice(0, 80);
        const { error: titleError } = await supabase.from("conversations").update({ title }).eq("id", conversationId).eq("user_id", user.id);
        if (titleError) throw new Error("Unable to update conversation.");
      }
    }

    let messages: AIMessage[] = [{ role: "user", content: parsed.data.message }];
    if (supabase && conversationId && userId) {
      const { data: history, error: historyError } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (historyError) throw new Error("Unable to load conversation context.");
      messages = (history ?? []).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content
      })).reverse();
      messages = await composeGunmarContext(supabase, userId, messages);
    }

    const result = await getAIProvider().streamTask({ ...parsed.data, messages, taskType: "conversation" }, { signal: request.signal });
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
            const { error: usageError } = await supabase.from("provider_usage").insert({
              user_id: userId,
              provider: result.provider,
              model: result.model,
              input_tokens: result.usage?.inputTokens ?? null,
              output_tokens: result.usage?.outputTokens ?? null,
              total_tokens: result.usage?.totalTokens ?? null,
              latency_ms: result.latencyMs,
              request_status: "completed",
              operation: "chat",
              units: result.usage?.totalTokens ?? 0,
              cost: 0
            });
            if (usageError) console.error("Unable to persist provider usage.", usageError);
            try {
              await learnFromUserMessage(supabase, userId, parsed.data.message, userMessageId);
            } catch (learningError) {
              console.error("Unable to persist learned memory.", learningError);
            }
            try {
              await recordMeaningfulInteraction(supabase, userId, { summary: "Completed a conversation turn." });
            } catch (relationshipError) {
              console.error("Unable to persist relationship continuity.", relationshipError);
            }
            if (parsed.data.message.trim().length >= 100 || extractMemoryCandidates(parsed.data.message).length > 0) {
              const { error: journalError } = await supabase.from("journal_entries").insert({
                user_id: userId,
                summary: `Conversation milestone: ${parsed.data.message.trim().slice(0, 240)}`
              });
              if (journalError) console.error("Unable to persist journal summary.", journalError);
            }
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
