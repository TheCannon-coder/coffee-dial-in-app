import { useState, useMemo } from "react";

const C = {
  espresso: "#2C1A0E",
  cream: "#FAF7F2",
  sand: "#EDE4DA",
  tan: "#C8A97A",
  muted: "#8B6347",
  border: "#E0D4C8",
  green: "#2A7A3A",
  greenBg: "#D4EDDA",
  red: "#B93030",
  redBg: "#FCDDDD",
  amber: "#B87A00",
  amberBg: "#FEF3CC",
};

function Slider({ label, value, min, max, step, format, onChange, sub }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void; sub?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.espresso }}>{label}</span>
          {sub && <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>{sub}</span>}
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.espresso }}>{format(value)}</span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: C.border }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 3, background: C.espresso, width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%", margin: 0 }} />
      </div>
    </div>
  );
}

function KPI({ label, value, sub, color, bg }: { label: string; value: string; sub?: string; color?: string; bg?: string }) {
  return (
    <div style={{ background: bg ?? C.sand, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: C.muted, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? C.espresso, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: "#F5F0EA", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.espresso }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

const fmt$ = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtN = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));

export function ReferralFinancialModel() {
  const [mau, setMau]               = useState(2000);
  const [proPrice, setProPrice]     = useState(4.99);
  const [shareRate, setShareRate]   = useState(0.08);
  const [refConvRate, setRefConvRate] = useState(0.25);
  const [refProRate, setRefProRate] = useState(0.18);
  const [orgProRate, setOrgProRate] = useState(0.06);
  const [brewBonus, setBrewBonus]   = useState(10);
  const [costPerCall, setCostPerCall] = useState(0.018);

  const m = useMemo(() => {
    const stripeFee = 0.029;
    const stripeFlat = 0.30;
    const hosting = 35;
    const retentionMonths = 6;

    const sharingUsers     = mau * shareRate;
    const newReferred      = sharingUsers * refConvRate;
    const organicPro       = mau * orgProRate;
    const referredPro      = newReferred * refProRate;
    const totalPro         = organicPro + referredPro;

    const grossRevenue     = totalPro * proPrice;
    const stripeCosts      = totalPro * (proPrice * stripeFee + stripeFlat);
    const netRevenue       = grossRevenue - stripeCosts;

    const freeTierBrews    = mau * 6;
    const proBrews         = totalPro * 20;
    const bonusBrews       = newReferred * brewBonus * 2;
    const totalBrews       = freeTierBrews + proBrews + bonusBrews;
    const apiCosts         = totalBrews * costPerCall;

    const grossProfit      = netRevenue - apiCosts - hosting;
    const margin           = netRevenue > 0 ? grossProfit / netRevenue : 0;

    const referralApiCost  = bonusBrews * costPerCall;
    const cac              = newReferred > 0 ? referralApiCost / newReferred : 0;

    const revenuePerPro    = proPrice * (1 - stripeFee) - stripeFlat;
    const ltv              = revenuePerPro * retentionMonths - 20 * costPerCall * retentionMonths;
    const ltvCac           = cac > 0 ? ltv / cac : Infinity;

    const growthRate       = 0.08 + shareRate * refConvRate * 0.5;
    const months           = Array.from({ length: 12 }, (_, i) => {
      const u = mau * Math.pow(1 + growthRate, i);
      const p = u * (orgProRate + shareRate * refConvRate * refProRate);
      const rev = p * proPrice * (1 - stripeFee) - p * stripeFlat;
      const cost = (u * 6 + p * 20 + u * shareRate * refConvRate * brewBonus * 2) * costPerCall + hosting;
      return { label: ["J","F","M","A","M","J","J","A","S","O","N","D"][i], revenue: rev, cost, profit: rev - cost };
    });

    const maxBar = Math.max(...months.map(m2 => Math.max(m2.revenue, m2.cost)), 1);
    const breakEvenPro = revenuePerPro > 0 ? (hosting + apiCosts) / revenuePerPro : Infinity;

    return { sharingUsers, newReferred, organicPro, referredPro, totalPro,
      grossRevenue, stripeCosts, netRevenue, apiCosts, grossProfit, margin,
      referralApiCost, cac, ltv, ltvCac, months, maxBar, breakEvenPro, bonusBrews };
  }, [mau, proPrice, shareRate, refConvRate, refProRate, orgProRate, brewBonus, costPerCall]);

  const isProfit  = m.grossProfit > 0;
  const isNear    = !isProfit && m.grossProfit > -50;
  const profitColor = isProfit ? C.green : C.red;
  const profitBg    = isProfit ? C.greenBg : C.redBg;
  const ltvCacGood  = m.ltvCac > 3;
  const ltvCacLabel = m.ltvCac === Infinity ? "∞" : `${m.ltvCac.toFixed(1)}×`;
  const verdictColor = isProfit ? C.green : isNear ? C.amber : C.red;
  const verdictBg    = isProfit ? C.greenBg : isNear ? C.amberBg : C.redBg;
  const verdictBorder = isProfit ? "#A8D9B0" : isNear ? "#F0D888" : "#F0AAAA";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#F5F0EA", minHeight: "100vh", padding: "32px 32px 60px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ background: C.espresso, borderRadius: 10, padding: "7px 14px" }}>
            <span style={{ color: C.cream, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em" }}>DIAL IN</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.espresso }}>Referral Program — Financial Model</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Adjust the sliders to model different scenarios. All figures are monthly estimates.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: 22 }}>

        {/* ── Assumptions ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ background: C.cream, borderRadius: 18, padding: "20px 20px 4px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, fontWeight: 700, marginBottom: 16 }}>📊 Scale</div>
            <Slider label="Monthly Active Users" value={mau} min={100} max={50000} step={100} format={fmtN} onChange={setMau} />
            <Slider label="Pro price" value={proPrice} min={1.99} max={19.99} step={0.5} format={v => `$${v.toFixed(2)}/mo`} onChange={setProPrice} />
          </div>

          <div style={{ background: C.cream, borderRadius: 18, padding: "20px 20px 4px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, fontWeight: 700, marginBottom: 16 }}>🔁 Referral mechanics</div>
            <Slider label="Share rate" value={shareRate} min={0.01} max={0.40} step={0.01} format={fmtPct} onChange={setShareRate} sub="users who invite" />
            <Slider label="Invite → signup" value={refConvRate} min={0.05} max={0.70} step={0.01} format={fmtPct} onChange={setRefConvRate} sub="conversion rate" />
            <Slider label="Referred → Pro" value={refProRate} min={0.01} max={0.60} step={0.01} format={fmtPct} onChange={setRefProRate} sub="upgrade rate" />
            <Slider label="Organic → Pro" value={orgProRate} min={0.01} max={0.30} step={0.005} format={fmtPct} onChange={setOrgProRate} sub="baseline" />
            <Slider label="Brew bonus (each side)" value={brewBonus} min={1} max={30} step={1} format={v => `${v} brews`} onChange={setBrewBonus} />
          </div>

          <div style={{ background: C.cream, borderRadius: 18, padding: "20px 20px 4px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, fontWeight: 700, marginBottom: 16 }}>⚙️ Unit costs</div>
            <Slider label="AI cost per brew" value={costPerCall} min={0.002} max={0.08} step={0.001} format={v => `$${v.toFixed(3)}`} onChange={setCostPerCall} sub="per OpenAI call" />
          </div>

          <div style={{ background: C.amberBg, borderRadius: 14, padding: "14px 16px", border: `1px solid #F0D888`, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: C.amber, marginBottom: 8 }}>Fixed assumptions</div>
            {[
              ["Stripe", "2.9% + $0.30/txn"],
              ["Hosting", "$35/mo flat"],
              ["Free brews avg", "6/user/mo"],
              ["Pro brews avg", "20/user/mo"],
              ["Pro retention", "6 months avg"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid rgba(0,0,0,0.05)`, color: C.espresso }}>
                <span style={{ color: C.muted }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Results ──────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KPI label="Net revenue / mo" value={fmt$(m.netRevenue)} sub={`${fmtN(m.totalPro)} Pro users`} />
            <KPI label="Gross profit / mo" value={fmt$(m.grossProfit)} sub={`${fmtPct(m.margin)} margin`} color={profitColor} bg={profitBg} />
            <KPI label="LTV per Pro user" value={fmt$(m.ltv)} sub="over 6 months" />
            <KPI label="LTV : CAC" value={ltvCacLabel} sub={`CAC = ${fmt$(m.cac)}`} color={ltvCacGood ? C.green : C.red} bg={ltvCacGood ? C.greenBg : C.redBg} />
          </div>

          {/* Funnel */}
          <div style={{ background: C.cream, borderRadius: 18, padding: "20px 22px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.espresso, marginBottom: 16 }}>Referral funnel this month</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {([
                { label: "MAU", value: fmtN(mau), color: "#D4C4B8" },
                { label: "Share code", value: fmtN(m.sharingUsers), color: "#C4AE98", rate: fmtPct(shareRate) },
                { label: "Sign ups", value: fmtN(m.newReferred), color: "#A8886A", rate: fmtPct(refConvRate) },
                { label: "Go Pro", value: fmtN(m.referredPro), color: C.espresso, rate: fmtPct(refProRate) },
              ] as { label: string; value: string; color: string; rate?: string }[]).map((step, i, arr) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : "none" }}>
                  <div style={{ background: step.color, borderRadius: 12, padding: "12px 14px", minWidth: 86, textAlign: "center" as const }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{step.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{step.value}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{arr[i + 1].rate}</span>
                      <div style={{ width: "100%", height: 2, background: C.border, position: "relative" }}>
                        <div style={{ position: "absolute", right: -4, top: -3, width: 8, height: 8, borderTop: `2px solid ${C.border}`, borderRight: `2px solid ${C.border}`, transform: "rotate(45deg)" }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
              <StatBox label="Referral bonus brews" value={fmtN(m.bonusBrews)} sub={`${brewBonus} brews × each side`} />
              <StatBox label="Referral program cost" value={fmt$(m.referralApiCost)} sub="API calls for bonus brews" />
              <StatBox label="Cost per referred signup" value={fmt$(m.cac)} sub="your referral CAC" />
            </div>
          </div>

          {/* P&L + Chart side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* P&L */}
            <div style={{ background: C.cream, borderRadius: 18, padding: "20px 22px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.espresso, marginBottom: 14 }}>Monthly P&L</div>
              {([
                { label: "Gross revenue", value: m.grossRevenue, type: "rev" },
                { label: "Stripe fees", value: -m.stripeCosts, type: "cost" },
                { label: "Net revenue", value: m.netRevenue, type: "sub" },
                { label: "AI API costs", value: -m.apiCosts, type: "cost" },
                { label: "Hosting", value: -35, type: "cost" },
                { label: "Gross profit", value: m.grossProfit, type: "total" },
              ] as { label: string; value: number; type: string }[]).map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 12px", borderRadius: row.type === "total" || row.type === "sub" ? 8 : 0,
                  background: row.type === "total" ? (isProfit ? C.greenBg : C.redBg) : row.type === "sub" ? C.sand : "transparent",
                  borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                  marginTop: row.type === "sub" || row.type === "total" ? 4 : 0,
                }}>
                  <span style={{ fontSize: 13, color: C.espresso, fontWeight: row.type === "total" || row.type === "sub" ? 700 : 400 }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: row.type === "total" ? profitColor : row.value < 0 ? C.red : C.green }}>
                    {row.value < 0 ? `−${fmt$(Math.abs(row.value))}` : fmt$(row.value)}
                  </span>
                </div>
              ))}
            </div>

            {/* 12-month chart */}
            <div style={{ background: C.cream, borderRadius: 18, padding: "20px 22px", border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.espresso }}>12-month outlook</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.espresso, display: "inline-block" }} />Rev</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.tan, display: "inline-block" }} />Cost</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120 }}>
                {m.months.map((mo, i) => {
                  const revH = Math.max(2, (mo.revenue / m.maxBar) * 110);
                  const costH = Math.max(2, (mo.cost / m.maxBar) * 110);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
                        <div style={{ width: 9, height: revH, background: C.espresso, borderRadius: "2px 2px 0 0" }} />
                        <div style={{ width: 9, height: costH, background: C.tan, borderRadius: "2px 2px 0 0" }} />
                      </div>
                      <span style={{ fontSize: 9, color: C.muted }}>{mo.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11, color: C.muted }}>
                <span>Mo 1: {fmt$(m.months[0].profit)}</span>
                <span style={{ fontWeight: 700, color: m.months[11].profit > 0 ? C.green : C.red }}>
                  Mo 12: {fmt$(m.months[11].profit)} profit
                </span>
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div style={{ background: verdictBg, borderRadius: 14, padding: "16px 20px", border: `1px solid ${verdictBorder}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: verdictColor, marginBottom: 6 }}>
              {isProfit ? "✅ Model is profitable" : isNear ? "⚠️ Near break-even" : "❌ Not yet profitable"}
            </div>
            <div style={{ fontSize: 13, color: C.espresso, lineHeight: 1.6 }}>
              {isProfit
                ? <>At {fmtN(mau)} MAU, you earn {fmt$(m.grossProfit)}/month with a {fmtPct(m.margin)} margin. The referral program costs {fmt$(m.referralApiCost)}/mo to run and delivers a <strong>{ltvCacLabel} LTV:CAC</strong> — {ltvCacGood ? "well above" : "below"} the 3× healthy threshold. Referred users convert to Pro at {fmtPct(refProRate)} vs {fmtPct(orgProRate)} organic.</>
                : <>Need roughly <strong>{fmtN(m.breakEvenPro)} Pro users</strong> to break even. Try raising Pro price, improving Pro conversion, or reducing the brew bonus to lower CAC.</>
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
