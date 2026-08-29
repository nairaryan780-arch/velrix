"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand";
import { postJson, patchJson } from "@/lib/client";

const INDUSTRIES = [
  ["real_estate", "Real estate"],
  ["coaching", "Coaching"],
  ["education", "Education"],
  ["agencies", "Agencies"],
  ["interior_design", "Interior design"],
  ["automotive", "Automotive"],
  ["local_services", "Local services"],
  ["other", "Other"],
];
const TONES = [
  ["professional", "Professional"],
  ["friendly", "Friendly"],
  ["premium", "Premium"],
  ["conversational", "Conversational"],
  ["concise", "Concise"],
];

export function OnboardingWizard({
  initial,
}: {
  initial: { name: string; industry: string; website: string; whatWeSell: string; agentName: string; tone: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState(initial);
  const [kb, setKb] = useState({ title: "", content: "" });
  const [sim, setSim] = useState<{ msgs: { role: string; text: string }[]; input: string; reply: string | null }>({ msgs: [], input: "", reply: null });

  const TOTAL = 6;

  async function next() {
    setBusy(true);
    if (step === 1) await patchJson("/api/v1/organization", { name: d.name, industry: d.industry, website: d.website });
    if (step === 1) await postJson("/api/v1/onboarding", { step: 2, industry: d.industry });
    if (step === 2) await patchJson("/api/v1/organization", { whatWeSell: d.whatWeSell });
    if (step === 3) await patchJson("/api/v1/agent", { name: d.agentName, tone: d.tone, businessDescription: d.whatWeSell });
    if (step === 4 && kb.title.trim() && kb.content.trim()) await postJson("/api/v1/knowledge", { type: "TEXT", title: kb.title, content: kb.content });
    setBusy(false);
    setStep((s) => Math.min(TOTAL, s + 1));
  }

  async function finish() {
    setBusy(true);
    await postJson("/api/v1/onboarding", { complete: true });
    router.push("/dashboard");
    router.refresh();
  }

  async function runSim() {
    const text = sim.input.trim();
    if (!text) return;
    const history = [...sim.msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.text })), { role: "user" as const, content: text }];
    setSim((s) => ({ ...s, msgs: [...s.msgs, { role: "user", text }], input: "" }));
    const res = await postJson<{ reply: string }>("/api/v1/agent/simulate", { history });
    if (res.ok) setSim((s) => ({ ...s, msgs: [...s.msgs, { role: "assistant", text: res.data.reply }], reply: res.data.reply }));
  }

  return (
    <div style={{ width: "100%", maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 8 }}>
        <Logo size={26} />
        <span style={{ fontWeight: 700, letterSpacing: "-0.03em", fontSize: 20 }}>Velrix setup</span>
      </div>
      {/* Progress */}
      <div style={{ display: "flex", gap: 5, margin: "16px 0 22px" }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < step ? "var(--accent)" : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>

      <div className="card fade-in" style={{ padding: 26 }}>
        {step === 1 && (
          <Section title="Tell us about your business" subtitle="This shapes how your agent talks and qualifies.">
            <Field label="Business name"><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
            <Field label="Industry">
              <select className="select" value={d.industry} onChange={(e) => setD({ ...d, industry: e.target.value })}>
                {INDUSTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Website (optional)"><input className="input" value={d.website} onChange={(e) => setD({ ...d, website: e.target.value })} placeholder="https://…" /></Field>
          </Section>
        )}
        {step === 2 && (
          <Section title="What do you sell?" subtitle="A short description the agent uses to guide conversations.">
            <textarea className="textarea" rows={4} value={d.whatWeSell} onChange={(e) => setD({ ...d, whatWeSell: e.target.value })} placeholder="e.g. Premium 2–4 BHK apartments and villas across Bengaluru." />
          </Section>
        )}
        {step === 3 && (
          <Section title="Give your agent a personality" subtitle="Name and tone customers will experience.">
            <Field label="Agent name"><input className="input" value={d.agentName} onChange={(e) => setD({ ...d, agentName: e.target.value })} /></Field>
            <Field label="Tone">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TONES.map(([v, l]) => (
                  <button key={v} className="badge" style={{ padding: "8px 14px", cursor: "pointer", background: d.tone === v ? "var(--accent-soft)" : undefined, color: d.tone === v ? "var(--fg)" : undefined }} onClick={() => setD({ ...d, tone: v })}>{l}</button>
                ))}
              </div>
            </Field>
          </Section>
        )}
        {step === 4 && (
          <Section title="Add some knowledge" subtitle="Paste key facts so the agent answers accurately (you can add more later).">
            <Field label="Title"><input className="input" value={kb.title} onChange={(e) => setKb({ ...kb, title: e.target.value })} placeholder="e.g. Pricing & FAQs" /></Field>
            <Field label="Content"><textarea className="textarea" rows={4} value={kb.content} onChange={(e) => setKb({ ...kb, content: e.target.value })} placeholder="Paste FAQs, pricing, or service details…" /></Field>
            <p className="muted" style={{ fontSize: 12.5 }}>Optional — skip if you&apos;ll add knowledge later.</p>
          </Section>
        )}
        {step === 5 && (
          <Section title={`Test ${d.agentName}`} subtitle="Chat as a customer and see how it responds.">
            <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 8, marginBottom: 10 }}>
              {sim.msgs.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Try &quot;What do you offer?&quot;</p>}
              {sim.msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div className={`bubble ${m.role === "user" ? "bubble-customer" : "bubble-agent"}`}>{m.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" value={sim.input} onChange={(e) => setSim({ ...sim, input: e.target.value })} onKeyDown={(e) => e.key === "Enter" && runSim()} placeholder="Message as a customer…" />
              <button className="btn btn-primary" onClick={runSim}>Send</button>
            </div>
          </Section>
        )}
        {step === 6 && (
          <Section title="You're ready to go live" subtitle="Activate your agent and start turning enquiries into qualified leads.">
            <div className="glass" style={{ padding: 14, borderRadius: 10, display: "grid", gap: 6, fontSize: 14 }}>
              <Row k="Business" v={d.name} />
              <Row k="Agent" v={`${d.agentName} · ${d.tone}`} />
              <Row k="Industry" v={INDUSTRIES.find(([x]) => x === d.industry)?.[1] ?? d.industry} />
            </div>
          </Section>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || busy}>Back</button>
          {step < TOTAL ? (
            <button className="btn btn-primary" onClick={next} disabled={busy}>{busy ? "Saving…" : step === 4 && !kb.title ? "Skip" : "Continue"}</button>
          ) : (
            <button className="btn btn-primary" onClick={finish} disabled={busy}>{busy ? "Activating…" : "Activate agent →"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h2>
        <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>;
}
