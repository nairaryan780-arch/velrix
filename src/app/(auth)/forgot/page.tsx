"use client";

import { useState } from "react";
import Link from "next/link";
import { postJson } from "@/lib/client";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await postJson("/api/v1/auth/reset-request", { email });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="card fade-in" style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Reset password</h1>
      {sent ? (
        <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
          If an account exists for <strong style={{ color: "var(--fg)" }}>{email}</strong>, a reset link is on its way.
          Check your inbox (or the server logs in development).
        </p>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            Enter your email and we&apos;ll send a reset link.
          </p>
          <form onSubmit={submit} style={{ marginTop: 20, display: "grid", gap: 14 }}>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <p className="muted" style={{ marginTop: 18, fontSize: 14, textAlign: "center" }}>
        <Link href="/login" style={{ color: "var(--accent)" }}>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
