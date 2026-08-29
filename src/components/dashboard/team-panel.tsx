"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson, patchJson, del } from "@/lib/client";
import { initials } from "@/lib/format";

type Member = { userId: string; name: string; email: string; role: string; isSelf: boolean };
const ROLES = ["OWNER", "ADMIN", "SALESPERSON", "VIEWER"];

export function TeamPanel({ members, canManage, isOwner }: { members: Member[]; canManage: boolean; isOwner: boolean }) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "SALESPERSON" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function invite() {
    setBusy(true);
    setError(null);
    const res = await postJson("/api/v1/team", form);
    setBusy(false);
    if (res.ok) {
      setInviteOpen(false);
      setForm({ name: "", email: "", role: "SALESPERSON" });
      setNotice(`Invite sent to ${form.email}. They'll get a link to set a password.`);
      router.refresh();
    } else setError(res.error);
  }

  async function changeRole(userId: string, role: string) {
    await patchJson("/api/v1/team", { userId, role });
    router.refresh();
  }
  async function remove(userId: string) {
    const res = await del(`/api/v1/team?userId=${userId}`);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        {notice ? <span style={{ color: "var(--good)", fontSize: 13 }}>{notice}</span> : <span />}
        {canManage && !inviteOpen && <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>+ Invite member</button>}
      </div>

      {inviteOpen && (
        <div className="card" style={{ padding: 18, marginBottom: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", gap: 12 }} className="team-invite">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {["ADMIN", "SALESPERSON", "VIEWER"].map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={invite} disabled={busy || !form.email || !form.name}>{busy ? "Inviting…" : "Send invite"}</button>
            <button className="btn btn-ghost" onClick={() => setInviteOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {members.map((m, i) => (
          <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderTop: i ? "1px solid var(--border)" : undefined }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(180deg,var(--accent),var(--accent-2))", color: "#04121a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>{initials(m.name)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name} {m.isSelf && <span className="muted" style={{ fontWeight: 400 }}>· you</span>}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{m.email}</div>
            </div>
            {canManage && !m.isSelf ? (
              <select className="select" value={m.role} onChange={(e) => changeRole(m.userId, e.target.value)} style={{ width: 150, height: 34 }} disabled={m.role === "OWNER" && !isOwner}>
                {ROLES.filter((r) => r !== "OWNER" || isOwner || m.role === "OWNER").map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}
              </select>
            ) : (
              <span className="badge">{m.role[0] + m.role.slice(1).toLowerCase()}</span>
            )}
            {canManage && !m.isSelf && <button className="btn btn-sm btn-danger" onClick={() => remove(m.userId)}>Remove</button>}
          </div>
        ))}
      </div>
      <style>{`@media (max-width:640px){ .team-invite{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}
