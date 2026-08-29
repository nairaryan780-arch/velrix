"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await postJson<{ redirect: string }>("/api/v1/auth/login", { email, password });
    if (res.ok) {
      router.push(res.data.redirect || "/dashboard");
      router.refresh();
    } else {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="card fade-in" style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Welcome back</h1>
      <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
        Sign in to your Velrix workspace.
      </p>

      <form onSubmit={submit} style={{ marginTop: 22, display: "grid", gap: 14 }}>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label className="label">Password</label>
            <Link href="/forgot" className="muted" style={{ fontSize: 12 }}>
              Forgot?
            </Link>
          </div>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" autoComplete="current-password" />
        </div>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: 13, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "8px 12px" }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="card" style={{ marginTop: 18, padding: "10px 14px", fontSize: 12.5 }}>
        <span className="muted">Demo login</span>
        <div style={{ marginTop: 3, fontFamily: "var(--font-mono)" }}>owner@velrix.dev · velrixdemo123</div>
      </div>

      <p className="muted" style={{ marginTop: 18, fontSize: 14, textAlign: "center" }}>
        New to Velrix?{" "}
        <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
