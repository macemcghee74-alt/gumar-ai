import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function getSupabaseBrowserClient() {
  const { url, key } = getSupabaseConfig();
  // @supabase/ssr 0.6.x cannot infer the generated schema with supabase-js 2.116.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return url && key ? createBrowserClient<Database, "public", any>(url, key) : null;
}