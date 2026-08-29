"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand";
import { initials } from "@/lib/format";
import { postJson } from "@/lib/client";

type NavItem = { href: string; label: string; icon: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/dashboard/leads", label: "Leads", icon: "users" },
  { href: "/dashboard/conversations", label: "Conversations", icon: "chat" },
  { href: "/dashboard/agent", label: "Agent", icon: "spark" },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: "book" },
  { href: "/dashboard/automations", label: "Automations", icon: "bolt" },
  { href: "/dashboard/channels", label: "Channels", icon: "plug" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
  { href: "/dashboard/team", label: "Team", icon: "team" },
  { href: "/dashboard/billing", label: "Billing", icon: "card" },
  { href: "/dashboard/settings", label: "Settings", icon: "cog" },
];

export function Shell({
  org,
  user,
  role,
  unread,
  children,
}: {
  org: { id: string; name: string; agentActive: boolean; isDemo: boolean };
  user: { name: string; email: string };
  role: string;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  async function logout() {
    await postJson("/api/v1/auth/logout", {});
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      {/* Sidebar */}
      <aside
        className="glass"
        style={{
          width: 240,
          flexShrink: 0,
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          inset: "0 auto 0 0",
          height: "100dvh",
          zIndex: 40,
          transition: "transform 0.2s ease",
        }}
        data-open={open ? "true" : "false"}
      >
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px 14px" }}>
          <Logo size={24} />
          <span style={{ fontWeight: 700, letterSpacing: "-0.03em", fontSize: 18 }}>Velrix</span>
        </Link>

        <nav style={{ display: "grid", gap: 2, marginTop: 6 }}>
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 11px",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--fg)" : "var(--fg-muted)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  border: active ? "1px solid rgba(34,211,238,0.2)" : "1px solid transparent",
                }}
              >
                <NavIcon name={item.icon} active={active} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
          <Link href="/dashboard/notifications" className="btn btn-sm" style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>🔔 Notifications</span>
            {unread > 0 && <span className="badge badge-hot" style={{ padding: "1px 7px" }}>{unread}</span>}
          </Link>
          <div className="card" style={{ padding: 10, position: "relative" }}>
            <button onClick={() => setMenu((m) => !m)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--fg)" }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(180deg,var(--accent),var(--accent-2))", color: "#04121a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>
                {initials(user.name)}
              </span>
              <span style={{ overflow: "hidden", textAlign: "left", flex: 1 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{user.name}</span>
                <span className="muted" style={{ fontSize: 11 }}>{role}</span>
              </span>
            </button>
            {menu && (
              <div className="card" style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, padding: 6, zIndex: 50 }}>
                <div style={{ padding: "6px 10px", fontSize: 12 }} className="muted">{user.email}</div>
                <button onClick={logout} className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", color: "var(--danger)" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 39 }} />}

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 240, minWidth: 0 }} className="dash-main">
        <header
          className="glass"
          style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderLeft: "none", borderRight: "none", borderTop: "none" }}
        >
          <button className="btn btn-sm btn-ghost mobile-only" onClick={() => setOpen(true)} style={{ display: "none" }}>
            ☰
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 600 }}>{org.name}</span>
            {org.isDemo && <span className="badge">Demo</span>}
            <span className="badge" style={{ color: org.agentActive ? "var(--good)" : "var(--fg-muted)" }}>
              <span className="dot" style={{ background: org.agentActive ? "var(--good)" : "var(--fg-muted)" }} />
              Agent {org.agentActive ? "active" : "paused"}
            </span>
          </div>
        </header>
        <main style={{ padding: "26px clamp(16px, 3vw, 34px)", maxWidth: 1400, margin: "0 auto" }}>{children}</main>
      </div>

      <style>{`
        @media (max-width: 860px) {
          aside[data-open] { transform: translateX(-100%); }
          aside[data-open="true"] { transform: translateX(0); }
          .dash-main { margin-left: 0 !important; }
          .mobile-only { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "var(--accent)" : "currentColor";
  const p: Record<string, string> = {
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11",
    chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    spark: "M12 2v6M12 16v6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M2 12h6M16 12h6M4.9 19.1l4.2-4.2M14.9 9.1l4.2-4.2",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    bolt: "M13 2 3 14h9l-1 8 10-12h-9z",
    plug: "M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5",
    chart: "M3 3v18h18M7 15l3-3 3 3 5-6",
    team: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M20 3.13a4 4 0 0 1 0 7.75",
    card: "M2 5h20v14H2zM2 10h20",
    cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V22a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 6.4 20.6l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6.4 9.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 12 4.6V4.5a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 12H22a2 2 0 1 1 0 4h-.09Z",
  };
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.1 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={p[name] ?? p.grid} />
    </svg>
  );
}
