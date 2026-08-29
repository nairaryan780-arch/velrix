import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em" }}>{title}</h1>
        {subtitle && <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "hot" | "warm" | "cold" | "good" | "accent";
}) {
  const color =
    tone === "hot" ? "var(--hot)" : tone === "warm" ? "var(--warm)" : tone === "cold" ? "var(--cold)" : tone === "good" ? "var(--good)" : tone === "accent" ? "var(--accent)" : "var(--fg)";
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div className="muted" style={{ fontSize: 12.5, fontWeight: 550, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 8, color, letterSpacing: "-0.02em" }}>{value}</div>
      {hint && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={`card ${className ?? ""}`} style={{ padding: 18, ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <h2 style={{ fontSize: 15, fontWeight: 650 }}>{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon = "✨",
  title,
  body,
  cta,
}: {
  icon?: string;
  title: string;
  body?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 34 }}>{icon}</div>
      <h3 style={{ fontSize: 17, fontWeight: 650, marginTop: 12 }}>{title}</h3>
      {body && <p className="muted" style={{ fontSize: 14, marginTop: 6, maxWidth: 440, marginInline: "auto" }}>{body}</p>}
      {cta && (
        <Link href={cta.href} className="btn btn-primary" style={{ marginTop: 18 }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
