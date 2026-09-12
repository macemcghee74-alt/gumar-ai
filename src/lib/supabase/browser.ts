import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // @supabase/ssr 0.6.x cannot infer the generated schema with supabase-js 2.116.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return url && key ? createBrowserClient<Database, "public", any>(url, key) : null;
}
