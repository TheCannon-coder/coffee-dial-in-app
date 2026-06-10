const C = {
  espresso: "#2C1A0E",
  cream: "#FAF7F2",
  bg: "#FAF7F2",
  card: "#EFEBE4",
  border: "#E0D5C8",
  muted: "#9A8070",
  accent: "#C8A97A",
};

const MONTHS = [
  { label: "Jan 2026", conversions: 35,  earnings: 81.00 },
  { label: "Feb 2026", conversions: 68,  earnings: 103.50 },
  { label: "Mar 2026", conversions: 92,  earnings: 118.50 },
  { label: "Apr 2026", conversions: 115, earnings: 124.50 },
  { label: "May 2026", conversions: 89,  earnings: 127.50 },
  { label: "Jun 2026", conversions: 101, earnings: 130.50 },
];

function fmt(n: number) {
  if (n >= 10000) return `$${Math.round(n / 1000)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

export function AffiliateWithStats() {
  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: C.bg,
      minHeight: "100dvh",
      width: 390,
      margin: "0 auto",
      overflowX: "hidden",
      overflowY: "auto",
    }}>
      {/* Status bar */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.espresso }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill={C.espresso}><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/></svg>
          <div style={{ width: 25, height: 12, border: `1.5px solid ${C.espresso}`, borderRadius: 3, padding: 2, display: "flex", alignItems: "center" }}>
            <div style={{ background: C.espresso, borderRadius: 1.5, height: "100%", width: "80%" }} />
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 20px 40px", display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Back arrow */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.espresso} strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: "34px", color: C.espresso, marginBottom: 8 }}>
          Refer &amp; Earn
        </div>
        <div style={{ fontSize: 14, lineHeight: "21px", color: C.muted, marginBottom: 24 }}>
          Share Dial In and earn a monthly commission for every Pro subscriber you bring in.
        </div>

        {/* Referral link card */}
        <div style={{
          borderRadius: 14, border: `1px solid ${C.border}`,
          background: C.card, padding: 14,
          display: "flex", flexDirection: "column", gap: 10,
          marginBottom: 28,
        }}>
          <div style={{ fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            coffeebrew.coach?ref=JAMES75
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ background: C.espresso, borderRadius: 100, padding: "9px 14px", display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: C.cream, fontWeight: 500 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </div>
            <div style={{ background: C.border, borderRadius: 100, padding: "9px 14px", display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: C.espresso, fontWeight: 500 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg>
              Share
            </div>
          </div>
        </div>

        {/* Section: Your stats */}
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, color: C.espresso, marginBottom: 12 }}>
          Your stats
        </div>

        {/* Stats 2×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <StatCard label="Active subs" value="87" />
          <StatCard label="Est. monthly" value="$130.50" highlight />
          <StatCard label="Total referrals" value="500" />
          <StatCard label="Total earned" value="$1,842" />
        </div>

        <div style={{ fontSize: 12, color: C.muted, marginBottom: 28 }}>
          $130.50 pending in next payout
        </div>

        {/* Section: Month by month */}
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, color: C.espresso, marginBottom: 12 }}>
          Month by month
        </div>

        <div style={{
          borderRadius: 14, border: `1px solid ${C.border}`,
          background: C.card, overflow: "hidden",
          marginBottom: 8,
        }}>
          {MONTHS.map((m, i) => (
            <div key={m.label} style={{
              display: "flex", alignItems: "center",
              padding: "12px 16px",
              borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
            }}>
              <div style={{ flex: 1, fontSize: 14, color: C.espresso }}>{m.label}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <div style={{ fontSize: 12, color: C.muted }}>+{m.conversions} referral{m.conversions !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.espresso }}>{fmt(m.earnings)}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: C.muted, marginBottom: 28 }}>
          Your rate: $1.50/active subscriber/month
        </div>

        {/* Section: Calculator */}
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, color: C.espresso, marginBottom: 4 }}>
          Earnings calculator
        </div>
        <div style={{ fontSize: 13, lineHeight: "20px", color: C.muted, marginBottom: 14 }}>
          Estimate what you'd earn based on your audience size.
        </div>

        {/* Audience pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16, marginRight: -20, paddingRight: 20 }}>
          {["1K","5K","10K","25K","50K","100K","250K","500K","1M+"].map((p, i) => (
            <div key={p} style={{
              borderRadius: 100,
              padding: "8px 16px",
              background: i === 4 ? C.espresso : C.card,
              border: i === 4 ? "none" : `1px solid ${C.border}`,
              fontSize: 14, fontWeight: 500,
              color: i === 4 ? C.cream : C.espresso,
              whiteSpace: "nowrap", flexShrink: 0,
            }}>{p}</div>
          ))}
        </div>

        {/* Funnel */}
        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, overflow: "hidden", marginBottom: 12 }}>
          {[
            { icon: "📣", label: "Audience reached", value: "50.0k" },
            { icon: "👤", label: "Sign up (~25%)", value: "12.5k" },
            { icon: "⭐", label: "Go Pro (~18% of signups)", value: "2.3k" },
          ].map((row, i) => (
            <div key={row.label} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "13px 16px",
              borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 14 }}>{row.icon}</span>
              <span style={{ flex: 1, fontSize: 13, color: C.muted }}>{row.label}</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: C.espresso }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Earnings card */}
        <div style={{
          borderRadius: 20, background: C.espresso,
          padding: 28, textAlign: "center", marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(250,247,242,0.5)", marginBottom: 6 }}>
            Estimated monthly earnings
          </div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 52, lineHeight: "56px", color: C.cream, marginBottom: 4 }}>
            $3.4k
          </div>
          <div style={{ fontSize: 14, color: "rgba(250,247,242,0.5)" }}>$41k per year</div>
        </div>

        <div style={{ fontSize: 11, lineHeight: "17px", textAlign: "center", color: C.muted }}>
          Based on 25% signup rate · 18% Pro conversion · $1.50/sub/month commission
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${highlight ? "transparent" : C.border}`,
      background: highlight ? C.espresso : C.card,
      padding: 16,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 24, color: highlight ? C.cream : C.espresso,
      }}>{value}</div>
      <div style={{ fontSize: 12, color: highlight ? "rgba(250,247,242,0.55)" : C.muted }}>{label}</div>
    </div>
  );
}
