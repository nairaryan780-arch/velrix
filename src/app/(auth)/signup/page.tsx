"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", organizationName: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await postJson<{ redirect: string }>("/api/v1/auth/signup", form);
    if (res.ok) {
      router.push(res.data.redirect || "/onboarding");
      router.refresh();
    } else {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="card fade-in" style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Create your workspace</h1>
      <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
        Hire your AI sales agent in a few minutes.
      </p>

      <form onSubmit={submit} style={{ marginTop: 22, display: "grid", gap: 14 }}>
        <div>
          <label className="label">Your name</label>
          <input className="input" required value={form.name} onChange={set("name")} placeholder="Priya Nair" autoComplete="name" />
        </div>
        <div>
          <label className="label">Work email</label>
          <input className="input" type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" autoComplete="email" />
        </div>
        <div>
          <label className="label">Business name</label>
          <input className="input" value={form.organizationName} onChange={set("organizationName")} placeholder="Prestige Estates" />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required value={form.password} onChange={set("password")} placeholder="At least 10 characters" autoComplete="new-password" />
        </div>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: 13, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "8px 12px" }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "Creating…" : "Create workspace"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 18, fontSize: 14, textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
