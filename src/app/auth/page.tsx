"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) {
      setStatus("Authentication is not configured for this deployment.");
      return;
    }

    setBusy(true);
    setStatus("");
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    setBusy(false);
    setStatus(error ? error.message : "Check your email for a secure sign-in link.");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">GUNMAR / PRIVATE ACCESS</p>
        <h1>Continue your thread.</h1>
        <p className="auth-copy">Use a magic link to access your conversations and memories. No password is stored by Gunmar.</p>
        <form onSubmit={requestLink}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send magic link"} <span>↗</span></button>
        </form>
        {status && <p className="auth-status" role="status">{status}</p>}
        <Link href="/">Back to Gunmar</Link>
      </section>
    </main>
  );
}
