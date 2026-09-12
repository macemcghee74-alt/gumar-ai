"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; updated_at: string };
type ProviderStatus = { configured: boolean; status: "available" | "missing_key" | "rate_limited" | "temporarily_failed" | "disabled" };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [signedIn, setSignedIn] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderStatus>>({});

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    void client.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
      if (!session?.user) setConversations([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void fetch("/api/conversations")
      .then(async (response) => response.ok ? response.json() : null)
      .then((data: { conversations?: Conversation[] } | null) => setConversations(data?.conversations ?? []));
  }, [signedIn]);

  useEffect(() => {
    void fetch("/api/providers/status")
      .then((response) => response.ok ? response.json() : null)
      .then((data: Record<string, ProviderStatus> | null) => setProviderStatuses(data ?? {}));
  }, []);

  async function selectConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`);
    if (!response.ok) return;
    const data = await response.json() as { messages: Message[] };
    setConversationId(id);
    setMessages(data.messages);
  }

  function formatProviderStatus(status?: ProviderStatus) {
    if (!status || status.status === "missing_key") return "Missing";
    if (status.status === "rate_limited") return "Rate limited";
    if (status.status === "temporarily_failed") return "Temporarily unavailable";
    if (status.status === "disabled") return "Disabled";
    return "Connected";
  }

  function startConversation() {
    setConversationId(undefined);
    setMessages([]);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, conversationId }) });
      if (!response.ok || !response.body) throw new Error((await response.json()).error ?? "Request failed.");
      const savedConversationId = response.headers.get("x-conversation-id");
      if (savedConversationId) {
        setConversationId(savedConversationId);
        setConversations((current) => current.some((item) => item.id === savedConversationId)
          ? current
          : [{ id: savedConversationId, title: message.slice(0, 80), updated_at: new Date().toISOString() }, ...current]);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        answer += decoder.decode(chunk.value, { stream: true });
        setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: answer } : item));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: `Error: ${message}` } : item));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="orb" />GUNMAR</div>
        <p className="eyebrow">PERSONAL AI / 01</p>
        <nav><button className="active" onClick={startConversation}>New conversation</button><a className="auth-link" href="/auth">{signedIn ? "Account" : "Sign in"}</a></nav>
        {signedIn && <div className="history"><p className="eyebrow">HISTORY</p>{conversations.length === 0 && <small>No saved threads yet.</small>}{conversations.map((conversation) => <button key={conversation.id} className={conversation.id === conversationId ? "selected" : ""} onClick={() => void selectConversation(conversation.id)}>{conversation.title}</button>)}</div>}
        <div className="provider-status"><p className="eyebrow">CLOUD PROVIDERS</p>{(["cerebras", "groq", "openrouter"] as const).map((provider) => <div key={provider}><span>{provider}</span><small>{formatProviderStatus(providerStatuses[provider])}</small></div>)}</div>
        <div className="status"><span className="dot" />Cloud-ready foundation</div>
      </aside>
      <section className="workspace">
        <header><div><p className="eyebrow">PRIVATE SESSION</p><h1>Stay curious.</h1></div><span className="badge">GUNMAR / ALPHA</span></header>
        <div className="transcript">
          {messages.length === 0 && <div className="welcome"><p className="eyebrow">GOOD TO MEET YOU</p><h2>A persistent mind,<br /><em>built with care.</em></h2><p>Start a conversation. Gunmar&apos;s cloud foundation is ready to grow into memory, reflection, and useful tools.</p></div>}
          {messages.map((message, index) => <article className={`message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "user" ? "YOU" : "GUNMAR"}</span><p>{message.content || "Thinking…"}</p></article>)}
        </div>
        <form className="composer" onSubmit={sendMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Say something to Gunmar…" rows={2} disabled={busy} /><button type="submit" disabled={busy || !input.trim()}>{busy ? "…" : "Send"} <span>↗</span></button></form>
        <p className="disclaimer">Cloud inference is configured server-side. Never enter secrets or sensitive credentials.</p>
      </section>
    </main>
  );
}
