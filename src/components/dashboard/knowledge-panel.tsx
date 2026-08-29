"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson, patchJson, del } from "@/lib/client";
import { timeAgo, titleCase } from "@/lib/format";

type Source = {
  id: string;
  type: string;
  title: string;
  status: string;
  errorMessage: string | null;
  lastIndexedAt: string | null;
  chunks: number;
};

export function KnowledgePanel({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<"TEXT" | "FAQ" | "URL">("TEXT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    const payload = type === "URL" ? { type, title, url } : { type, title, content };
    const res = await postJson<{ status: string; errorMessage?: string }>("/api/v1/knowledge", payload);
    setBusy(false);
    if (res.ok) {
      if (res.data.status === "FAILED") setError(res.data.errorMessage ?? "Indexing failed");
      else {
        setAdding(false);
        setTitle("");
        setContent("");
        setUrl("");
        router.refresh();
      }
    } else setError(res.error);
  }

  async function remove(id: string) {
    await del(`/api/v1/knowledge?id=${id}`);
    router.refresh();
  }
  async function reindex(id: string) {
    await patchJson(`/api/v1/knowledge?id=${id}`, {});
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        {!adding && <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add knowledge</button>}
      </div>

      {adding && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {(["TEXT", "FAQ", "URL"] as const).map((t) => (
              <button key={t} className="badge" style={{ padding: "6px 14px", cursor: "pointer", background: type === t ? "var(--accent-soft)" : undefined, color: type === t ? "var(--fg)" : undefined }} onClick={() => setType(t)}>
                {t === "URL" ? "🔗 Website URL" : t === "FAQ" ? "❓ FAQ" : "📄 Text"}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label className="label">Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pricing & packages" />
            </div>
            {type === "URL" ? (
              <div>
                <label className="label">URL to crawl</label>
                <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com/pricing" />
              </div>
            ) : (
              <div>
                <label className="label">Content</label>
                <textarea className="textarea" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste the information the agent should know…" />
              </div>
            )}
            {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={add} disabled={busy || !title.trim()}>{busy ? "Indexing…" : "Add & index"}</button>
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {sources.length === 0 && !adding ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32 }}>📚</div>
          <h3 style={{ fontSize: 16, fontWeight: 650, marginTop: 10 }}>No knowledge yet</h3>
          <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>Add your pricing, FAQs, or website so Velrix can answer accurately.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sources.map((s) => (
            <div key={s.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{s.title}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                  {titleCase(s.type)} · {s.chunks} chunk{s.chunks === 1 ? "" : "s"} · {s.lastIndexedAt ? `indexed ${timeAgo(s.lastIndexedAt)}` : "not indexed"}
                  {s.errorMessage && <span style={{ color: "var(--danger)" }}> · {s.errorMessage}</span>}
                </div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => reindex(s.id)}>Reindex</button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(s.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "READY" ? "badge-good" : status === "FAILED" ? "" : "badge-warm";
  const color = status === "FAILED" ? "var(--danger)" : undefined;
  return <span className={`badge ${tone}`} style={{ color, fontSize: 11 }}>{titleCase(status)}</span>;
}
