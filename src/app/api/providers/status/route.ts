import { NextResponse } from "next/server";
import { getProviderStatuses } from "@/lib/ai/provider";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getProviderStatuses(), {
    headers: { "cache-control": "no-store" }
  });
}
