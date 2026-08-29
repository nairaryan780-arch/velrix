"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postJson, patchJson } from "@/lib/client";
import { TemperatureBadge } from "@/components/badges";
import { clockTime, titleCase } from "@/lib/format";

type Message = { id: string; author: string; body: string; createdAt: string; meta?: unknown };
type Convo = {
  id: string;
  status: string;
  summary: string | null;
  optOut: boolean;
  assignedTo?: { id: string; name: string } | null;
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    score: number;
    temperature: string;
    status: string;
    interest: string | null;
    budget: string | null;
    timeline: string | null;
    location: string | null;
    intent: string | null;
    qualified: boolean;
    scoreReasons: string[];
    requirements: Record<string, string>;
  };
  messages: Message[];
};

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFYING", "QUALIFIED", "HANDED_OFF", "WON", "LOST", "DORMANT", "OPTED_OUT"];

export function LeadWorkspace({
  initial,
  members,
  canWrite,
}: {
  initial: Convo;
  members: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const [convo, setConvo] = useState<Convo>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/v1/conversations/${initial.id}`);
    if (res.ok) setConvo(await res.json());
  }, [initial.id]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!busy) refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convo.messages.length]);

  const inTakeover = convo.status === "HUMAN_TAKEOVER";
  const closed = convo.status === "CLOSED";

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    await postJson(`/api/v1/conversations/${convo.id}/action`, { action, ...extra });
    await refresh();
    setBusy(false);
  }

  async function send() {
    const body = input.trim();
    if (!body) return;
    setBusy(true);
    setInput("");
    await postJson(`/api/v1/conversations/${convo.id}/action`, { action: "human_message", body });
    await refresh();
    setBusy(false);
  }

  async function updateLead(patch: Record<string, unknown>) {
    setBusy(true);
    await patchJson(`/api/v1/leads/${convo.lead.id}`, patch);
    await refresh();
    setBusy(false);
  }

  const lead = convo.lead;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }} className="lw-grid">
      {/* Conversation */}
      <div className="card" style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 190px)", minHeight: 460 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusPill status={convo.status} />
            {convo.assignedTo && <span className="muted" style={{ fontSize: 13 }}>· {convo.assignedTo.name}</span>}
          </div>
          {canWrite && (
            <div style={{ display: "flex", gap: 8 }}>
              {!inTakeover && !closed && (
                <button className="btn btn-sm btn-primary" onClick={() => act("takeover")} disabled={busy}>
                  Take over
                </button>
              )}
              {inTakeover && (
                <button className="btn btn-sm" onClick={() => act("release")} disabled={busy}>
                  Release to AI
                </button>
              )}
              {!closed && (
                <button className="btn btn-sm btn-ghost" onClick={() => act("close")} disabled={busy}>
                  Close
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {convo.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          <div ref={bottomRef} />
        </div>

        {inTakeover ? (
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="Type your reply…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn btn-primary" onClick={send} disabled={busy || !input.trim()}>
              Send
            </button>
          </div>
        ) : (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }} className="muted">
            <span style={{ fontSize: 13 }}>
              {closed
                ? "This conversation is closed."
                : "Velrix is handling this conversation. Take over to reply as a human — the AI will stop."}
            </span>
          </div>
        )}
      </div>

      {/* Intelligence panel */}
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 650, fontSize: 16 }}>{lead.name ?? "Unknown visitor"}</div>
              {lead.phone && <div className="muted" style={{ fontSize: 13 }}>{lead.phone}</div>}
              {lead.email && <div className="muted" style={{ fontSize: 13 }}>{lead.email}</div>}
            </div>
            <ScoreRing score={lead.score} temperature={lead.temperature} />
          </div>
          <div style={{ marginTop: 12 }}>
            <TemperatureBadge temperature={lead.temperature} />
          </div>
        </div>

        {convo.summary && (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>AI summary</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{convo.summary}</p>
          </div>
        )}

        <div className="card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Qualification</div>
          <div style={{ display: "grid", gap: 8 }}>
            <Field label="Interest" value={lead.interest} />
            <Field label="Location" value={lead.location} />
            <Field label="Budget" value={lead.budget} />
            <Field label="Timeline" value={lead.timeline} />
            <Field label="Intent" value={lead.intent} />
          </div>
        </div>

        {lead.scoreReasons.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Why this score</div>
            <ul style={{ display: "grid", gap: 6, fontSize: 13 }}>
              {lead.scoreReasons.map((r, i) => (
                <li key={i} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--accent)" }}>›</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canWrite && (
          <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
            <div>
              <label className="label">Lead status</label>
              <select className="select" value={lead.status} onChange={(e) => updateLead({ status: e.target.value })} disabled={busy}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Assigned to</label>
              <select
                className="select"
                value={convo.assignedTo?.id ?? ""}
                onChange={(e) => updateLead({ assignedToId: e.target.value || null })}
                disabled={busy}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <style>{`@media (max-width: 900px){ .lw-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const a = message.author;
  if (a === "SYSTEM") {
    return (
      <div style={{ textAlign: "center", fontSize: 12 }} className="muted">
        {message.body}
      </div>
    );
  }
  const isCustomer = a === "CUSTOMER";
  const cls = isCustomer ? "bubble-customer" : a === "HUMAN" ? "bubble-human" : "bubble-agent";
  const label = a === "AGENT" ? "Velrix" : a === "HUMAN" ? "You" : "";
  const followUp = (message.meta as { followUp?: boolean } | undefined)?.followUp;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isCustomer ? "flex-start" : "flex-end", gap: 3 }} className="fade-in">
      <div className={`bubble ${cls}`}>{message.body}</div>
      <div className="muted" style={{ fontSize: 11, padding: "0 4px" }}>
        {label && `${label} · `}
        {clockTime(message.createdAt)}
        {followUp && " · follow-up"}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; t: string }> = {
    AI_ACTIVE: { c: "var(--accent)", t: "Velrix active" },
    HUMAN_TAKEOVER: { c: "var(--good)", t: "Human active" },
    CLOSED: { c: "var(--fg-muted)", t: "Closed" },
    DORMANT: { c: "var(--fg-muted)", t: "Dormant" },
    OPEN: { c: "var(--accent)", t: "Open" },
  };
  const s = map[status] ?? map.OPEN;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600 }}>
      <span className="dot pulse" style={{ background: s.c }} />
      {s.t}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 550, textAlign: "right" }}>{value ?? "—"}</span>
    </div>
  );
}

function ScoreRing({ score, temperature }: { score: number; temperature: string }) {
  const t = temperature.toUpperCase();
  const color = t === "HOT" ? "var(--hot)" : t === "WARM" ? "var(--warm)" : "var(--cold)";
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, score) / 100) * c;
  return (
    <div style={{ position: "relative", width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 32 32)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 18, color }}>{score}</div>
    </div>
  );
}
