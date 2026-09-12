import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const redirectUrl = new URL(url.origin);
  redirectUrl.pathname = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("error", "Missing authentication code.");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("error", "Authentication is not configured.");
    return NextResponse.redirect(redirectUrl);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("error", "The sign-in link is invalid or expired.");
  }
  return NextResponse.redirect(redirectUrl);
}
