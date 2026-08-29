import { titleCase } from "@/lib/format";

export function TemperatureBadge({ temperature }: { temperature: string }) {
  const t = temperature.toUpperCase();
  const cls = t === "HOT" ? "badge-hot" : t === "WARM" ? "badge-warm" : "badge-cold";
  const icon = t === "HOT" ? "🔥" : t === "WARM" ? "☀️" : "❄️";
  return (
    <span className={`badge ${cls}`}>
      <span aria-hidden>{icon}</span>
      {titleCase(t)}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  WON: "badge-good",
  QUALIFIED: "badge-good",
  HOT: "badge-hot",
  LOST: "",
  OPTED_OUT: "",
  DORMANT: "",
};

export function LeadStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_TONE[status] ?? ""}`}>{titleCase(status)}</span>;
}

export function ScoreBar({ score, temperature }: { score: number; temperature: string }) {
  const t = temperature.toUpperCase();
  const color = t === "HOT" ? "var(--hot)" : t === "WARM" ? "var(--warm)" : "var(--cold)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 84 }}>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, Math.max(3, score))}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color, fontWeight: 600, width: 24, textAlign: "right" }}>
        {score}
      </span>
    </div>
  );
}

export function ChannelBadge({ type }: { type: string }) {
  const map: Record<string, string> = { WEBSITE: "🌐", WHATSAPP: "💬", INSTAGRAM: "📸", API: "🔌" };
  return (
    <span className="badge">
      <span aria-hidden>{map[type] ?? "🌐"}</span>
      {titleCase(type)}
    </span>
  );
}
