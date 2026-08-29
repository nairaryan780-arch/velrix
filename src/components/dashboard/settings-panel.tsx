"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson, del } from "@/lib/client";

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

export function SettingsPanel({
  org,
  isOwner,
}: {
  org: { name: string; industry: string; website: string; whatWeSell: string; timezone: string; slug: string };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(org);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await patchJson("/api/v1/organization", {
      name: form.name,
      industry: form.industry,
      website: form.website,
      whatWeSell: form.whatWeSell,
      timezone: form.timezone,
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function deleteOrg() {
    setDeleting(true);
    const res = await del(`/api/v1/organization?confirm=${encodeURIComponent(confirm)}`);
    if (res.ok) {
      router.push("/login");
      router.refresh();
    } else setDeleting(false);
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 680 }}>
      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 650, marginBottom: 14 }}>Business details</h2>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Business name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Industry</label>
              <select className="select" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                {INDUSTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <label className="label">What you sell</label>
            <textarea className="textarea" rows={2} value={form.whatWeSell} onChange={(e) => setForm({ ...form, whatWeSell: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            {saved && <span style={{ color: "var(--good)", fontSize: 13 }}>✓ Saved</span>}
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="card" style={{ padding: 18, borderColor: "rgba(248,113,113,0.25)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 650, color: "var(--danger)" }}>Danger zone</h2>
          <p className="muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
            Permanently delete this workspace and all its leads, conversations and data. This cannot be undone. Type
            <span className="kbd" style={{ margin: "0 4px" }}>{org.slug}</span> to confirm.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={org.slug} style={{ maxWidth: 260 }} />
            <button className="btn btn-danger" onClick={deleteOrg} disabled={confirm !== org.slug || deleting}>
              {deleting ? "Deleting…" : "Delete workspace"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
