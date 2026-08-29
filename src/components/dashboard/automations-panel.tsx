"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson, postJson } from "@/lib/client";

type Rule = { key: string; prompt: string; required: boolean; weight: number };
type Step = { delayMinutes: number; message: string };

export function AutomationsPanel({
  rules: initialRules,
  sequence,
}: {
  rules: Rule[];
  sequence: { name: string; active: boolean; maxAttempts: number; steps: Step[] };
}) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [steps, setSteps] = useState<Step[]>(sequence.steps.length ? sequence.steps : [{ delayMinutes: 120, message: "" }]);
  const [active, setActive] = useState(sequence.active);
  const [savingQ, setSavingQ] = useState(false);
  const [savingF, setSavingF] = useState(false);
  const [savedQ, setSavedQ] = useState(false);
  const [savedF, setSavedF] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveRules() {
    setSavingQ(true);
    setError(null);
    const res = await postJson("/api/v1/qualification", { rules });
    setSavingQ(false);
    if (res.ok) { setSavedQ(true); router.refresh(); } else setError(res.error);
  }
  async function saveFollowups() {
    setSavingF(true);
    await patchJson("/api/v1/automations", { active, steps });
    setSavingF(false);
    setSavedF(true);
    router.refresh();
  }

  function fmtDelay(min: number) {
    if (min % 1440 === 0) return `${min / 1440}d`;
    if (min % 60 === 0) return `${min / 60}h`;
    return `${min}m`;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Qualification */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ fontSize: 15, fontWeight: 650 }}>Qualification questions</h2>
          <button className="btn btn-sm" onClick={() => setRules([...rules, { key: `field_${rules.length + 1}`, prompt: "", required: false, weight: 10 }])}>+ Add</button>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>The agent decides what&apos;s already known and only asks what&apos;s missing. Weights feed the lead score.</p>
        <div style={{ display: "grid", gap: 10 }}>
          {rules.map((r, i) => (
            <div key={i} className="glass" style={{ padding: 12, borderRadius: 10, display: "grid", gridTemplateColumns: "140px 1fr 90px 80px 32px", gap: 10, alignItems: "center" }}>
              <input className="input" value={r.key} onChange={(e) => update(setRules, rules, i, { key: e.target.value.replace(/[^a-z0-9_]/g, "") })} placeholder="key" style={{ height: 34, fontFamily: "var(--font-mono)", fontSize: 12 }} />
              <input className="input" value={r.prompt} onChange={(e) => update(setRules, rules, i, { prompt: e.target.value })} placeholder="Question to ask…" style={{ height: 34 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }} className="muted">
                <input type="checkbox" checked={r.required} onChange={(e) => update(setRules, rules, i, { required: e.target.checked })} style={{ accentColor: "var(--accent-2)" }} /> Required
              </label>
              <input className="input" type="number" value={r.weight} onChange={(e) => update(setRules, rules, i, { weight: Number(e.target.value) })} style={{ height: 34 }} title="Weight" />
              <button className="btn btn-sm btn-ghost" onClick={() => setRules(rules.filter((_, x) => x !== i))} style={{ color: "var(--danger)" }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
          <button className="btn btn-primary" onClick={saveRules} disabled={savingQ}>{savingQ ? "Saving…" : "Save questions"}</button>
          {savedQ && <span style={{ color: "var(--good)", fontSize: 13 }}>✓ Saved</span>}
          {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
        </div>
      </div>

      {/* Follow-ups */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ fontSize: 15, fontWeight: 650 }}>Follow-up sequence</h2>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }} className="muted">
            {active ? "On" : "Off"}
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ accentColor: "var(--accent-2)", width: 16, height: 16 }} />
          </label>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Sent when a customer goes quiet. Automatically stops if they reply, a human takes over, or the conversation closes.</p>
        <div style={{ display: "grid", gap: 12 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ display: "grid", gap: 4, width: 130, flexShrink: 0 }}>
                <label className="label" style={{ margin: 0 }}>Wait</label>
                <select className="select" value={s.delayMinutes} onChange={(e) => update(setSteps, steps, i, { delayMinutes: Number(e.target.value) })} style={{ height: 34 }}>
                  {[30, 60, 120, 360, 720, 1440, 2880, 4320].map((m) => <option key={m} value={m}>{fmtDelay(m)}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="label" style={{ margin: "0 0 4px" }}>Message #{i + 1}</label>
                <textarea className="textarea" rows={2} value={s.message} onChange={(e) => update(setSteps, steps, i, { message: e.target.value })} placeholder="Just checking in…" />
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setSteps(steps.filter((_, x) => x !== i))} style={{ color: "var(--danger)", marginTop: 22 }}>×</button>
            </div>
          ))}
          {steps.length < 5 && <button className="btn btn-sm" onClick={() => setSteps([...steps, { delayMinutes: 1440, message: "" }])} style={{ justifySelf: "start" }}>+ Add step</button>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
          <button className="btn btn-primary" onClick={saveFollowups} disabled={savingF}>{savingF ? "Saving…" : "Save sequence"}</button>
          {savedF && <span style={{ color: "var(--good)", fontSize: 13 }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}

function update<T>(setter: (v: T[]) => void, arr: T[], i: number, patch: Partial<T>) {
  setter(arr.map((item, x) => (x === i ? { ...item, ...patch } : item)));
}
