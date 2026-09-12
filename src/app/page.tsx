"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string>();

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
      if (savedConversationId) setConversationId(savedConversationId);
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
        <nav><button className="active">Conversation</button><button disabled>Memory <small>soon</small></button><button disabled>Journal <small>soon</small></button><a className="auth-link" href="/auth">Sign in</a></nav>
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
