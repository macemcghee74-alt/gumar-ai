import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

describe("Supabase environment compatibility", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers canonical names", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://canonical.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "canonical-key");
    vi.stubEnv("NEXTPUBLICSUPABASEURL", "https://compat.supabase.co");
    vi.stubEnv("NEXTPUBLICSUPABASEPUBLISHABLEKEY", "compat-key");
    expect(getSupabaseConfig()).toEqual({ url: "https://canonical.supabase.co", key: "canonical-key" });
  });

  it("accepts joined compatibility names", () => {
    vi.stubEnv("NEXTPUBLICSUPABASEURL", "https://compat.supabase.co");
    vi.stubEnv("NEXTPUBLICSUPABASEPUBLISHABLEKEY", "compat-key");
    expect(getSupabaseConfig()).toEqual({ url: "https://compat.supabase.co", key: "compat-key" });
  });

  it("fails closed when both forms are missing", () => {
    expect(getSupabaseConfig()).toEqual({ url: undefined, key: undefined });
    expect(getSupabaseBrowserClient()).toBeNull();
  });

  it("creates a browser client from compatibility names", () => {
    vi.stubEnv("NEXTPUBLICSUPABASEURL", "https://compat.supabase.co");
    vi.stubEnv("NEXTPUBLICSUPABASEPUBLISHABLEKEY", "compat-key");
    expect(getSupabaseBrowserClient()).not.toBeNull();
  });
});