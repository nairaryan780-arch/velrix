"use client";

import { useState } from "react";
import { postJson, del } from "@/lib/client";

type Integration = { provider: string; status: string; lastError: string | null };

const PROVIDERS: { id: string; name: string; icon: string; blurb: string; fields: { key: string; label: string; placeholder?: string }[] }[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    icon: "💬",
    blurb: "Receive and reply to WhatsApp enquiries via the Meta Cloud API.",
    fields: [
      { key: "phoneNumberId", label: "Phone number ID" },
      { key: "accessToken", label: "Permanent access token" },
      { key: "appSecret", label: "App secret (for webhook verification)" },
    ],
  },
  {
    id: "instagram",
    name: "Instagram Messaging",
    icon: "📸",
    blurb: "Turn Instagram DMs into qualified leads via the Meta Graph API.",
    fields: [
      { key: "pageId", label: "Connected Page ID" },
      { key: "accessToken", label: "Page access token" },
      { key: "appSecret", label: "App secret" },
    ],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    icon: "💳",
    blurb: "Accept subscription payments in INR for your Velrix plan.",
    fields: [
      { key: "keyId", label: "Key ID" },
      { key: "keySecret", label: "Key secret" },
    ],
  },
];

export function ChannelsPanel({
  publicKey,
  appUrl,
  integrations,
}: {
  publicKey: string;
  appUrl: string;
  integrations: Integration[];
}) {
  const snippet = `<script src="${appUrl}/widget.js" data-velrix-key="${publicKey}" async></script>`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Website */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>🌐</span>
            <div>
              <div style={{ fontWeight: 650 }}>Website chat</div>
              <div className="muted" style={{ fontSize: 13 }}>Live — paste this snippet before &lt;/body&gt;.</div>
            </div>
          </div>
          <span className="badge badge-good"><span className="dot" style={{ background: "var(--good)" }} />Connected</span>
        </div>
        <div style={{ marginTop: 14, background: "rgba(0,0,0,0.35)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 12.5, overflowX: "auto", position: "relative" }}>
          <code style={{ whiteSpace: "pre" }}>{snippet}</code>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn btn-sm btn-primary" onClick={copy}>{copied ? "✓ Copied" : "Copy snippet"}</button>
          <a className="btn btn-sm" href={`/widget-demo?key=${encodeURIComponent(publicKey)}`} target="_blank" rel="noopener">Preview widget →</a>
        </div>
      </div>

      {/* Integrations */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 650, margin: "6px 2px 12px" }}>Messaging & billing integrations</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {PROVIDERS.map((p) => (
            <IntegrationCard key={p.id} provider={p} state={integrations.find((i) => i.provider === p.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  provider,
  state,
}: {
  provider: (typeof PROVIDERS)[number];
  state?: Integration;
}) {
  const [openForm, setOpenForm] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connected = state?.status === "connected";

  async function connect() {
    setBusy(true);
    setError(null);
    const res = await postJson("/api/v1/integrations", { provider: provider.id, credentials: values });
    setBusy(false);
    if (res.ok) {
      setOpenForm(false);
      location.reload();
    } else {
      setError(res.error);
    }
  }

  async function disconnect() {
    setBusy(true);
    await del(`/api/v1/integrations?provider=${provider.id}`);
    location.reload();
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{provider.icon}</span>
          <div>
            <div style={{ fontWeight: 650 }}>{provider.name}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{provider.blurb}</div>
          </div>
        </div>
        {connected ? (
          <span className="badge badge-good">Connected</span>
        ) : (
          <span className="badge" style={{ fontSize: 11 }}>Needs credentials</span>
        )}
      </div>

      {!connected && (
        <div className="card" style={{ marginTop: 12, padding: "8px 11px", fontSize: 12, background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.2)" }}>
          <span style={{ color: "var(--warm)" }}>REQUIRES EXTERNAL CREDENTIALS.</span> The integration is fully wired — add your provider keys to activate it.
        </div>
      )}

      {openForm && !connected && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {provider.fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input className="input" value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} />
            </div>
          ))}
          {error && <div style={{ color: "var(--danger)", fontSize: 12.5 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={connect} disabled={busy}>{busy ? "Saving…" : "Save & connect"}</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setOpenForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        {connected ? (
          <button className="btn btn-sm btn-danger" onClick={disconnect} disabled={busy}>Disconnect</button>
        ) : (
          !openForm && <button className="btn btn-sm" onClick={() => setOpenForm(true)}>Connect</button>
        )}
      </div>
    </div>
  );
}
