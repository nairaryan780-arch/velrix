"use client";

import { useState } from "react";
import { patchJson, postJson } from "@/lib/client";

type AgentData = {
  name: string;
  tone: string;
  businessDescription: string;
  instructions: string;
  policies: string;
  scoring: { thresholds: { hot: number; warm: number } };
  handoff: { hotAutoNotify?: boolean; hotScore?: number; onHumanRequest?: boolean; onLowConfidence?: boolean };
  active: boolean;
};

const TONES = ["professional", "friendly", "premium", "conversational", "concise"];

export function AgentConsole({ initial }: { initial: AgentData }) {
  const [a, setA] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof AgentData>(key: K, value: AgentData[K]) {
    setA((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await patchJson("/api/v1/agent", {
      name: a.name,
      tone: a.tone,
      businessDescription: a.businessDescription,
      instructions: a.instructions,
      policies: a.policies,
      scoring: a.scoring,
      handoff: a.handoff,
      active: a.active,
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16, alignItems: "start" }} className="ac-grid">
      <div style={{ display: "grid", gap: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 650 }}>Agent identity</h2>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span className="muted">{a.active ? "Active" : "Paused"}</span>
              <Toggle on={a.active} onChange={(v) => set("active", v)} />
            </label>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="label">Agent name</label>
                <input className="input" value={a.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="label">Tone</label>
                <select className="select" value={a.tone} onChange={(e) => set("tone", e.target.value)}>
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Business description</label>
              <textarea className="textarea" rows={3} value={a.businessDescription} onChange={(e) => set("businessDescription", e.target.value)} placeholder="What does your business do?" />
            </div>
            <div>
              <label className="label">Instructions</label>
              <textarea className="textarea" rows={3} value={a.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="How should the agent behave? What should it prioritise?" />
            </div>
            <div>
              <label className="label">Policies (what it must never invent)</label>
              <textarea className="textarea" rows={2} value={a.policies} onChange={(e) => set("policies", e.target.value)} placeholder="Pricing is confirmed by a manager. Site visits are free." />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 650, marginBottom: 14 }}>Scoring thresholds</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">🔥 Hot at score ≥ {a.scoring.thresholds.hot}</label>
              <input type="range" min={40} max={100} value={a.scoring.thresholds.hot} onChange={(e) => set("scoring", { thresholds: { ...a.scoring.thresholds, hot: Number(e.target.value) } })} style={{ width: "100%" }} />
            </div>
            <div>
              <label className="label">☀️ Warm at score ≥ {a.scoring.thresholds.warm}</label>
              <input type="range" min={10} max={90} value={a.scoring.thresholds.warm} onChange={(e) => set("scoring", { thresholds: { ...a.scoring.thresholds, warm: Number(e.target.value) } })} style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 650, marginBottom: 14 }}>Human handoff rules</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <CheckRow label="Notify the team when a lead turns hot" checked={a.handoff.hotAutoNotify !== false} onChange={(v) => set("handoff", { ...a.handoff, hotAutoNotify: v })} />
            <CheckRow label="Hand off when the customer asks for a human" checked={a.handoff.onHumanRequest !== false} onChange={(v) => set("handoff", { ...a.handoff, onHumanRequest: v })} />
            <CheckRow label="Hand off when the AI is not confident" checked={Boolean(a.handoff.onLowConfidence)} onChange={(v) => set("handoff", { ...a.handoff, onLowConfidence: v })} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save agent"}
          </button>
          {saved && <span style={{ color: "var(--good)", fontSize: 13 }}>✓ Saved</span>}
        </div>
      </div>

      <Simulator agentName={a.name} />

      <style>{`@media (max-width: 1000px){ .ac-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

type SimMsg = { role: "user" | "assistant"; content: string };

function Simulator({ agentName }: { agentName: string }) {
  const [messages, setMessages] = useState<SimMsg[]>([]);
  const [input, setInput] = useState("");
  const [meta, setMeta] = useState<{ score: number; temperature: string; provider: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    const content = input.trim();
    if (!content || loading) return;
    const next: SimMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const res = await postJson<{ reply: string; score: number; temperature: string; provider: string }>("/api/v1/agent/simulate", { history: next });
    if (res.ok) {
      setMessages((m) => [...m, { role: "assistant", content: res.data.reply }]);
      setMeta({ score: res.data.score, temperature: res.data.temperature, provider: res.data.provider });
    } else {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${res.error}` }]);
    }
    setLoading(false);
  }

  const tcolor = meta?.temperature === "HOT" ? "var(--hot)" : meta?.temperature === "WARM" ? "var(--warm)" : "var(--cold)";

  return (
    <div className="card" style={{ padding: 0, position: "sticky", top: 76, display: "flex", flexDirection: "column", height: "calc(100dvh - 190px)", minHeight: 460 }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 650, fontSize: 14 }}>Test simulator</div>
        {meta && (
          <span className="badge" style={{ color: tcolor, borderColor: tcolor }}>
            {meta.temperature} · {meta.score}
          </span>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {messages.length === 0 && (
          <div className="muted" style={{ fontSize: 13, textAlign: "center", margin: "auto", maxWidth: 240 }}>
            Chat with {agentName} as if you were a customer. Try &quot;I&apos;m looking for a 2BHK in Whitefield&quot;.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end" }}>
            <div className={`bubble ${m.role === "user" ? "bubble-customer" : "bubble-agent"}`}>{m.content}</div>
          </div>
        ))}
        {loading && <div className="muted" style={{ fontSize: 12, textAlign: "right" }}>{agentName} is typing…</div>}
      </div>
      <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <input className="input" placeholder="Message as a customer…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{ width: 40, height: 23, borderRadius: 999, border: "1px solid var(--border)", background: on ? "var(--accent-2)" : "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer", transition: "background 0.15s" }}
      aria-pressed={on}
    >
      <span style={{ position: "absolute", top: 2, left: on ? 19 : 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
    </button>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent-2)" }} />
      {label}
    </label>
  );
}
