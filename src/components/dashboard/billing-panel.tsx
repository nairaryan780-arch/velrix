"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

type Plan = { code: string; name: string; monthlyInr: number; description: string; limits: Record<string, number> };
type Usage = { metric: string; label: string; used: number; limit: number };

export function BillingPanel({
  plans,
  currentPlan,
  usage,
  canManage,
  razorpayConfigured,
}: {
  plans: Plan[];
  currentPlan: string;
  usage: Usage[];
  canManage: boolean;
  razorpayConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function choose(code: string) {
    if (code === currentPlan) return;
    setBusy(code);
    await postJson("/api/v1/billing", { plan: code });
    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      {/* Usage */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 650, marginBottom: 14 }}>Usage this month</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
          {usage.map((u) => {
            const ratio = u.limit > 0 ? Math.min(1, u.used / u.limit) : 0;
            const over = u.used >= u.limit;
            return (
              <div key={u.metric}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span className="muted">{u.label}</span>
                  <span style={{ fontWeight: 600, color: over ? "var(--danger)" : undefined }}>{u.used.toLocaleString()} / {u.limit.toLocaleString()}</span>
                </div>
                <div style={{ height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
                  <div style={{ width: `${ratio * 100}%`, height: "100%", background: over ? "var(--danger)" : ratio > 0.8 ? "var(--warm)" : "var(--accent)", borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!razorpayConfigured && (
        <div className="card" style={{ padding: "10px 14px", marginBottom: 16, fontSize: 13, background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.2)" }}>
          <span style={{ color: "var(--warm)", fontWeight: 600 }}>Test mode.</span> Razorpay isn&apos;t connected, so switching plans changes entitlements without charging. Add Razorpay keys in Channels to enable live checkout.
        </div>
      )}

      {/* Plans */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        {plans.map((p) => {
          const current = p.code === currentPlan;
          return (
            <div key={p.code} className="card" style={{ padding: 20, border: current ? "1px solid rgba(34,211,238,0.4)" : undefined, boxShadow: current ? "0 8px 30px -12px rgba(34,211,238,0.4)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 17 }}>{p.name}</span>
                {current && <span className="badge badge-good">Current</span>}
              </div>
              <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
                ₹{p.monthlyInr.toLocaleString()}
                <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> /mo</span>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 6, minHeight: 36 }}>{p.description}</p>
              <ul style={{ display: "grid", gap: 6, fontSize: 13, margin: "14px 0" }}>
                <li>✓ {p.limits.messages.toLocaleString()} AI messages</li>
                <li>✓ {p.limits.leads.toLocaleString()} leads</li>
                <li>✓ {p.limits.channels} channel{p.limits.channels > 1 ? "s" : ""}</li>
                <li>✓ {p.limits.teamMembers} team members</li>
                <li>✓ {p.limits.knowledgeSources} knowledge sources</li>
              </ul>
              {canManage && (
                <button className={`btn ${current ? "" : "btn-primary"}`} style={{ width: "100%" }} disabled={current || busy === p.code} onClick={() => choose(p.code)}>
                  {current ? "Current plan" : busy === p.code ? "Switching…" : `Switch to ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
