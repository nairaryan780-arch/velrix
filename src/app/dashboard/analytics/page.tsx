import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { analyticsSummary, analyticsSeries } from "@/lib/analytics";
import { PageHeader, StatCard, Card, SectionTitle } from "@/components/dashboard/ui";
import { pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.org.id;

  const [summary, series, byTemp, bySource] = await Promise.all([
    analyticsSummary(orgId, 30),
    analyticsSeries(orgId, 14),
    prisma.lead.groupBy({ by: ["temperature"], where: { organizationId: orgId }, _count: true }),
    prisma.lead.groupBy({ by: ["source"], where: { organizationId: orgId }, _count: true }),
  ]);

  const tempCounts = { HOT: 0, WARM: 0, COLD: 0 } as Record<string, number>;
  byTemp.forEach((t) => (tempCounts[t.temperature] = t._count));
  const totalLeads = tempCounts.HOT + tempCounts.WARM + tempCounts.COLD;

  const maxSeries = Math.max(1, ...series.map((s) => s.enquiries));
  const funnel = [
    { label: "Enquiries", value: summary.enquiries, color: "var(--accent)" },
    { label: "Qualified", value: summary.qualified, color: "var(--good)" },
    { label: "Hot", value: summary.hot, color: "var(--hot)" },
    { label: "Handoffs", value: summary.handoffs, color: "var(--warm)" },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Real performance from your database — last 30 days." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
        <StatCard label="Enquiries" value={summary.enquiries} tone="accent" />
        <StatCard label="Qualified" value={summary.qualified} hint={pct(summary.qualificationRate)} tone="good" />
        <StatCard label="Hot leads" value={summary.hot} tone="hot" />
        <StatCard label="Handoffs" value={summary.handoffs} tone="warm" />
        <StatCard label="Avg response" value={summary.avgResponseMs != null ? `${(summary.avgResponseMs / 1000).toFixed(1)}s` : "—"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 16 }} className="an-grid">
        <Card>
          <SectionTitle>Enquiries &amp; qualified · 14 days</SectionTitle>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
            {series.map((s) => (
              <div key={s.day} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%", gap: 2 }} title={`${s.day}: ${s.enquiries} enquiries, ${s.qualified} qualified`}>
                <div style={{ height: `${(s.enquiries / maxSeries) * 100}%`, minHeight: 2, background: "linear-gradient(180deg,var(--accent),var(--accent-2))", borderRadius: "3px 3px 0 0" }} />
                <div style={{ height: `${(s.qualified / maxSeries) * 100}%`, background: "var(--good)", borderRadius: "0 0 3px 3px", opacity: 0.8 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12 }} className="muted">
            <span><span className="dot" style={{ background: "var(--accent)", marginRight: 5 }} />Enquiries</span>
            <span><span className="dot" style={{ background: "var(--good)", marginRight: 5 }} />Qualified</span>
          </div>
        </Card>

        <Card>
          <SectionTitle>Conversion funnel</SectionTitle>
          <div style={{ display: "grid", gap: 12 }}>
            {funnel.map((f) => (
              <div key={f.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span className="muted">{f.label}</span>
                  <span style={{ fontWeight: 600 }}>{f.value}</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
                  <div style={{ width: `${(f.value / funnelMax) * 100}%`, height: "100%", background: f.color, borderRadius: 999, minWidth: f.value > 0 ? 6 : 0 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }} className="an-grid">
        <Card>
          <SectionTitle>Lead quality</SectionTitle>
          {totalLeads === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>No leads yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {(["HOT", "WARM", "COLD"] as const).map((t) => (
                <div key={t}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{t === "HOT" ? "🔥 Hot" : t === "WARM" ? "☀️ Warm" : "❄️ Cold"}</span>
                    <span className="muted">{tempCounts[t]} · {pct(tempCounts[t] / totalLeads)}</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
                    <div style={{ width: `${(tempCounts[t] / totalLeads) * 100}%`, height: "100%", background: t === "HOT" ? "var(--hot)" : t === "WARM" ? "var(--warm)" : "var(--cold)", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Channel performance</SectionTitle>
          {bySource.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>No leads yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {bySource.map((s) => (
                <div key={s.source} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span className="muted">{s.source.charAt(0) + s.source.slice(1).toLowerCase()}</span>
                  <span style={{ fontWeight: 600 }}>{s._count} lead{s._count === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <style>{`@media (max-width: 900px){ .an-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
