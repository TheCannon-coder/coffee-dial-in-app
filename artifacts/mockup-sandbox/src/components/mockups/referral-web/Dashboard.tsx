const TIERS = [
  { name: "Standard", min: 0, rate: "$0.75" },
  { name: "Silver", min: 10, rate: "$1.00" },
  { name: "Gold", min: 100, rate: "$1.50" },
  { name: "Platinum", min: 1000, rate: "$2.00" },
];

const activeReferrals = 34;
const currentTierIdx = 1; // Silver
const nextTier = TIERS[currentTierIdx + 1];
const progressPct = Math.min(100, (activeReferrals / (nextTier?.min ?? 1)) * 100);

const payouts = [
  { date: "Nov 1, 2025", amount: "$82.40", status: "Paid", method: "Stripe" },
  { date: "Oct 1, 2025", amount: "$61.20", status: "Paid", method: "Stripe" },
  { date: "Sep 1, 2025", amount: "$45.00", status: "Paid", method: "Stripe" },
  { date: "Dec 1, 2025", amount: "$94.00", status: "Scheduled", method: "Stripe" },
];

const barData = [18, 34, 22, 48, 61, 45, 82, 97, 73, 110, 88, 125];
const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const maxBar = Math.max(...barData);

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E8DDD4", padding: "22px 24px", ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: "#8B6347", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
      {children}
    </div>
  );
}

export function Dashboard() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#FAF7F2", minHeight: "100dvh", width: "100%", color: "#2C1A0E" }}>

      {/* Top nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: "1px solid #E8DDD4", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#2C1A0E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FAF7F2" strokeWidth="1.8"><path d="M3 8h14a3 3 0 0 1 0 6h-1" strokeLinecap="round"/><path d="M3 8v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V8" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 19 }}>Partner Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 13, color: "#8B6347" }}>Signed in with <strong style={{ color: "#2C1A0E" }}>Apple ID</strong></span>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#8B6347" }}>S</div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 40px 80px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Hero row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
          <div style={{ background: "#2C1A0E", borderRadius: 20, padding: "30px 32px", color: "#FAF7F2" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A89080", marginBottom: 8 }}>Total earnings</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 52, fontWeight: 400, lineHeight: 1 }}>$247<span style={{ fontSize: 26, opacity: 0.6 }}>.80</span></div>
            <div style={{ fontSize: 13, color: "#A89080", marginTop: 10 }}>↑ $38.40 this month · next payout Dec 1</div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button style={{ background: "#8B6347", color: "#FAF7F2", border: "none", borderRadius: 100, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Request early payout</button>
              <button style={{ background: "transparent", color: "#FAF7F2", border: "1px solid #5A4030", borderRadius: 100, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Copy referral link</button>
            </div>
          </div>

          <Card>
            <SectionLabel>Your tier</SectionLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 26 }}>Silver</span>
              <span style={{ fontSize: 13, color: "#8B6347" }}>$1.00/mo per subscriber</span>
            </div>
            <div style={{ height: 8, background: "#EDE4DA", borderRadius: 100, overflow: "hidden", marginTop: 14 }}>
              <div style={{ width: `${progressPct}%`, height: "100%", background: "#8B6347", borderRadius: 100 }} />
            </div>
            <div style={{ fontSize: 12.5, color: "#8B6347", marginTop: 8 }}>
              {activeReferrals} active referrals · {nextTier.min - activeReferrals} more to reach <strong style={{ color: "#2C1A0E" }}>{nextTier.name}</strong> ({nextTier.rate}/mo)
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid #F0E8DF" }}>
              {TIERS.map((t, i) => (
                <div key={t.name} style={{ textAlign: "center", opacity: i <= currentTierIdx ? 1 : 0.4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: i <= currentTierIdx ? "#2A7A3A" : "#C4B4A4", margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 11, fontWeight: i === currentTierIdx ? 700 : 500 }}>{t.name}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "Clicks", value: "1,842", sub: "↑ 12% vs last month" },
            { label: "Sign-ups", value: "247", sub: "13.4% conversion" },
            { label: "Active subscribers", value: "34", sub: "↑ 5 this month" },
            { label: "Avg. commission", value: "$1.00", sub: "per subscriber / mo" },
          ].map((s) => (
            <Card key={s.label} style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 12, color: "#8B6347", marginBottom: 4, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 28 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#2A7A3A", marginTop: 2 }}>{s.sub}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Referral chart */}
          <Card>
            <SectionLabel>Referrals this year</SectionLabel>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110 }}>
              {barData.map((val, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ width: "100%", background: i === 11 ? "#8B6347" : "#EDE4DA", borderRadius: 4, height: `${(val / maxBar) * 100}%`, minHeight: 4 }} />
                  <span style={{ fontSize: 10, color: "#8B6347", fontWeight: i === 11 ? 700 : 400 }}>{months[i]}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Payout method */}
          <Card>
            <SectionLabel>Payout account</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#FAF7F2", borderRadius: 14, padding: "16px" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#635BFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M13 3L4 14h6l-1 7 9-11h-6z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Stripe Connect</div>
                <div style={{ fontSize: 12, color: "#2A7A3A" }}>● Connected · verified</div>
              </div>
              <button style={{ background: "#fff", border: "1px solid #E0D5C8", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Manage</button>
            </div>
            <div style={{ fontSize: 12, color: "#8B6347", marginTop: 12, lineHeight: 1.5 }}>
              Tax forms (W-9) and bank details are handled securely by Stripe. Payouts run automatically on the 1st of each month.
            </div>
          </Card>
        </div>

        {/* Projections */}
        <Card>
          <SectionLabel>Earnings projection</SectionLabel>
          <div style={{ fontSize: 13, color: "#5A4030", marginBottom: 18 }}>See how your monthly earnings grow as your active referral count increases.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <input type="range" min={0} max={1200} defaultValue={120} style={{ flex: 1, accentColor: "#8B6347" }} readOnly />
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, width: 90, textAlign: "right" }}>120 refs</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { refs: 34, tier: "Silver", monthly: "$34", yearly: "$408" },
              { refs: 120, tier: "Gold", monthly: "$180", yearly: "$2,160", active: true },
              { refs: 500, tier: "Gold", monthly: "$750", yearly: "$9,000" },
              { refs: 1000, tier: "Platinum", monthly: "$2,000", yearly: "$24,000" },
            ].map((p) => (
              <div key={p.refs} style={{ background: p.active ? "#2C1A0E" : "#FAF7F2", color: p.active ? "#FAF7F2" : "#2C1A0E", borderRadius: 14, padding: "16px" }}>
                <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.refs.toLocaleString()} referrals</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 22, marginTop: 4 }}>{p.monthly}<span style={{ fontSize: 13, opacity: 0.6 }}>/mo</span></div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{p.yearly}/yr · {p.tier} tier</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payout history */}
        <Card>
          <SectionLabel>Payout history</SectionLabel>
          {payouts.map((p) => (
            <div key={p.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F0E8DF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B6347" strokeWidth="2"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.amount}</div>
                  <div style={{ fontSize: 12, color: "#8B6347" }}>{p.date} · {p.method}</div>
                </div>
              </div>
              <div style={{ background: p.status === "Paid" ? "#D4EDDA" : "#F5E7CC", borderRadius: 100, padding: "3px 12px", fontSize: 12, fontWeight: 600, color: p.status === "Paid" ? "#2A7A3A" : "#95720F" }}>{p.status}</div>
            </div>
          ))}
        </Card>

        {/* Linked accounts */}
        <Card>
          <SectionLabel>Linked sign-in methods</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#FAF7F2", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="16" height="19" viewBox="0 0 16 19" fill="#2C1A0E"><path d="M13.2 10.1c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.6 0-1.7-.8-2.7-.7-1.4 0-2.7.8-3.4 2-1.5 2.5-.4 6.2 1 8.2.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7s1.6.7 2.7.6c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.3v-.8z"/></svg>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>Apple ID — used to sign in on your iPhone</span>
              </div>
              <span style={{ fontSize: 12, color: "#2A7A3A", fontWeight: 600 }}>Connected</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#FAF7F2", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.9 2.1-1.8 2.7v2.3h3a8.8 8.8 0 0 0 2.6-6.6z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.3c-.8.6-1.9.9-3 .9-2.3 0-4.3-1.6-5-3.7H1v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M4 10.7c-.2-.6-.3-1.2-.3-1.7s.1-1.2.3-1.7V4.9H1a9 9 0 0 0 0 8.1l3-2.3z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.4 3.4 1.3l2.6-2.6C13.5.9 11.4 0 9 0A9 9 0 0 0 1 4.9l3 2.4C4.7 5.2 6.7 3.6 9 3.6z"/></svg>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>Google — add for easy sign-in on desktop</span>
              </div>
              <button style={{ background: "#fff", border: "1px solid #E0D5C8", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Connect</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#FAF7F2", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6347" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>Recovery email — sarah92@gmail.com</span>
              </div>
              <span style={{ fontSize: 12, color: "#2A7A3A", fontWeight: 600 }}>Verified</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#A89080", marginTop: 14, lineHeight: 1.5 }}>
            Adding Google or a recovery email lets you sign in to this dashboard from any computer, not just from inside the app.
          </div>
        </Card>
      </div>
    </div>
  );
}
