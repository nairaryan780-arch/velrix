import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Wordmark } from "@/components/brand";

export const dynamic = "force-dynamic";

const LIFECYCLE = ["Enquiry", "Understand", "Respond", "Qualify", "Score", "Follow up", "Handoff"];

const FEATURES = [
  { icon: "💬", title: "Replies instantly", body: "Natural, on-brand conversations that answer from your approved knowledge — never invented facts." },
  { icon: "🎯", title: "Qualifies & scores", body: "Deterministic lead scoring on budget, timeline, intent and fit. Every score is explained." },
  { icon: "⏰", title: "Follows up automatically", body: "Brings quiet leads back with timed follow-ups that stop the moment they reply." },
  { icon: "🔥", title: "Hands off hot leads", body: "Detects buying intent and alerts your team. Take over and the AI steps aside instantly." },
  { icon: "🧠", title: "Real knowledge base", body: "Upload pricing, FAQs and pages. Retrieved as facts — with prompt-injection protection." },
  { icon: "📊", title: "Mission control", body: "Live analytics, lead intelligence and conversation history in one premium dashboard." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div style={{ minHeight: "100dvh", position: "relative" }}>
      <div className="aurora" />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px clamp(16px,4vw,48px)", maxWidth: 1200, margin: "0 auto" }}>
        <Wordmark />
        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {user ? (
            <Link href="/dashboard" className="btn btn-sm btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm btn-ghost">Sign in</Link>
              <Link href="/signup" className="btn btn-sm btn-primary">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 clamp(16px,4vw,48px)" }}>
        {/* Hero */}
        <section style={{ textAlign: "center", padding: "70px 0 40px" }}>
          <div className="badge" style={{ marginBottom: 22 }}>
            <span className="dot pulse" style={{ background: "var(--accent)" }} /> AI Sales Agent for growing businesses
          </div>
          <h1 className="title-xl" style={{ maxWidth: 840, margin: "0 auto" }}>
            Turn every enquiry into a<br />
            <span style={{ background: "linear-gradient(90deg,var(--accent),#60a5fa)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>qualified opportunity.</span>
          </h1>
          <p className="muted" style={{ fontSize: 18, maxWidth: 620, margin: "22px auto 0", lineHeight: 1.6 }}>
            Velrix is an AI sales agent that receives enquiries, has natural conversations, qualifies prospects, scores
            them, follows up, and hands the hot ones to your team.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
            <Link href="/signup" className="btn btn-primary" style={{ height: 46, padding: "0 24px" }}>Hire your agent</Link>
            <Link href="/widget-demo" className="btn" style={{ height: 46, padding: "0 24px" }}>See it live →</Link>
          </div>
          <p className="dim" style={{ fontSize: 13, marginTop: 14 }}>Demo login: owner@velrix.dev · velrixdemo123</p>
        </section>

        {/* Lifecycle */}
        <section style={{ padding: "24px 0" }}>
          <div className="card" style={{ padding: "18px 20px", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            {LIFECYCLE.map((stage, i) => (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: i === LIFECYCLE.length - 1 ? "var(--accent)" : "var(--fg)" }}>{stage}</span>
                {i < LIFECYCLE.length - 1 && <span className="muted">→</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Example */}
        <section style={{ padding: "50px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "center" }} className="ex-grid">
            <div className="card" style={{ padding: 20, display: "grid", gap: 10 }}>
              <Bubble who="c">Hi, I&apos;m looking for a 2BHK.</Bubble>
              <Bubble who="a">Absolutely. What area are you looking in?</Bubble>
              <Bubble who="c">Whitefield, budget around ₹90 lakh.</Bubble>
              <Bubble who="a">Perfect — are you looking to buy this month or over the next few months?</Bubble>
              <Bubble who="c">This month.</Bubble>
            </div>
            <div className="card" style={{ padding: 20, borderColor: "rgba(251,113,133,0.3)" }}>
              <div className="badge badge-hot" style={{ marginBottom: 12 }}>🔥 HOT LEAD · 92</div>
              <div style={{ display: "grid", gap: 7, fontSize: 14 }}>
                <Row k="Type" v="2BHK" /><Row k="Location" v="Whitefield" /><Row k="Budget" v="₹90L" /><Row k="Timeline" v="This month" />
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                &quot;Customer has confirmed requirements, budget and immediate purchase intent.&quot;
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: "30px 0 60px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 24 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 650, marginTop: 12 }}>{f.title}</h3>
                <p className="muted" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "20px 0 80px", textAlign: "center" }}>
          <div className="card" style={{ padding: "44px 24px", background: "linear-gradient(180deg, rgba(34,211,238,0.08), var(--panel))" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Stop replying to every lead yourself.</h2>
            <p className="muted" style={{ fontSize: 16, marginTop: 10 }}>It&apos;s like hiring an employee who never sleeps.</p>
            <Link href="/signup" className="btn btn-primary" style={{ height: 46, padding: "0 28px", marginTop: 22 }}>Get started free</Link>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px", textAlign: "center" }} className="muted">
        <span style={{ fontSize: 13 }}>© {new Date().getFullYear()} Velrix. Turn every enquiry into a qualified opportunity.</span>
      </footer>

      <style>{`@media (max-width: 780px){ .ex-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Bubble({ who, children }: { who: "c" | "a"; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: who === "c" ? "flex-start" : "flex-end" }}>
      <div className={`bubble ${who === "c" ? "bubble-customer" : "bubble-agent"}`}>{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>;
}
