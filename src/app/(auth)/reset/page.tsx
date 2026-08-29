"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { postJson } from "@/lib/client";

function ResetInner() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await postJson("/api/v1/auth/reset", { token, password });
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } else {
      setError(res.error);
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="card" style={{ padding: 28 }}>
        <p className="muted">This reset link is missing its token. Request a new one from the{" "}
          <Link href="/forgot" style={{ color: "var(--accent)" }}>forgot password</Link> page.
        </p>
      </div>
    );
  }

  return (
    <div className="card fade-in" style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Set a new password</h1>
      {done ? (
        <p style={{ marginTop: 12, fontSize: 14, color: "var(--good)" }}>Password updated. Redirecting to sign in…</p>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 20, display: "grid", gap: 14 }}>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 10 chars)" autoComplete="new-password" />
          {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: 28 }} />}>
      <ResetInner />
    </Suspense>
  );
}
