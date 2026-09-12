import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function getSupabaseServerClient() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;

  const cookieStore = await cookies();
  // @supabase/ssr 0.6.x cannot infer the generated schema with supabase-js 2.116.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<Database, "public", any>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components can be read-only; route handlers can still refresh cookies.
        }
      }
    }
  });
}