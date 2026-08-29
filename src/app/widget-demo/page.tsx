import { prisma } from "@/lib/db";
import { WidgetEmbed } from "@/components/widget-embed";

export const dynamic = "force-dynamic";

// A stand-in "customer website" that embeds the real Velrix widget.
export default async function WidgetDemoPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  let publicKey = key;
  if (!publicKey) {
    const channel = await prisma.channel.findFirst({ where: { type: "WEBSITE", organization: { isDemo: true } }, orderBy: { createdAt: "asc" } });
    publicKey = channel?.publicKey;
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#0b0f16", color: "#e9eef6" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 20, letterSpacing: "-0.02em" }}>Prestige Estates</strong>
          <nav style={{ display: "flex", gap: 18, fontSize: 14 }} className="muted">
            <span>Projects</span>
            <span>About</span>
            <span>Contact</span>
          </nav>
        </div>

        <div style={{ marginTop: 60, textAlign: "center" }}>
          <div className="badge" style={{ marginBottom: 16 }}>Demo customer site</div>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Find your next home in Bengaluru
          </h1>
          <p className="muted" style={{ fontSize: 17, marginTop: 16, maxWidth: 560, marginInline: "auto" }}>
            Premium 2–4 BHK apartments and villas in Whitefield, Sarjapur and Hebbal. Chat with our assistant in the
            bottom corner — it&apos;s the live Velrix widget.
          </p>
          <div style={{ marginTop: 26, display: "flex", gap: 12, justifyContent: "center" }}>
            <span className="btn btn-primary">Explore projects</span>
            <span className="btn">Book a site visit</span>
          </div>
        </div>

        <div style={{ marginTop: 70, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {[
            { t: "Prestige Lakeside", d: "Whitefield · 2–3 BHK · Ready to move" },
            { t: "Prestige Green Valley", d: "Sarjapur · 3–4 BHK villas · 6 months" },
            { t: "Prestige Skyline", d: "Hebbal · 2–4 BHK · Under construction" },
          ].map((c) => (
            <div key={c.t} className="card" style={{ padding: 18 }}>
              <div style={{ height: 120, borderRadius: 10, background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(59,130,246,0.12))", marginBottom: 12 }} />
              <div style={{ fontWeight: 650 }}>{c.t}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{c.d}</div>
            </div>
          ))}
        </div>

        {!publicKey && (
          <p style={{ marginTop: 40, textAlign: "center", color: "var(--danger)" }}>
            No widget key provided and no demo channel found. Append <code>?key=web_xxx</code>.
          </p>
        )}
      </div>

      {publicKey && <WidgetEmbed publicKey={publicKey} />}
    </div>
  );
}
