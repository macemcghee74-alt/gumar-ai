import { NextResponse } from "next/server";
import { chatInputSchema, getAIProvider } from "@/lib/ai/provider";

export const runtime = "edge";

export async function POST(request: Request) {
  const parsed = chatInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Message must be between 1 and 12,000 characters." }, { status: 400 });
  }

  try {
    const stream = await getAIProvider().streamReply(parsed.data);
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to contact the AI provider.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
