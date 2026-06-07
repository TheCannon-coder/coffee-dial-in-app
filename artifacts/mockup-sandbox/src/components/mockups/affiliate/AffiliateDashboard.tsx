const barData = [18, 34, 22, 48, 61, 45, 82, 97, 73, 110, 88, 125];
const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
const maxBar = Math.max(...barData);

export function AffiliateDashboard() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#FAF7F2", minHeight: "100dvh", width: 390, margin: "0 auto", overflowX: "hidden" }}>

      {/* Status bar */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#2C1A0E" }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#2C1A0E"><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/></svg>
          <div style={{ width: 25, height: 12, border: "1.5px solid #2C1A0E", borderRadius: 3, padding: 2, display: "flex", alignItems: "center" }}><div style={{ background: "#2C1A0E", borderRadius: 1.5, height: "100%", width: "75%" }} /></div>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, color: "#2C1A0E" }}>Affiliate</span>
        </div>
        <div style={{ background: "#D4EDDA", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#2A7A3A" }}>Active</div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Earnings hero */}
        <div style={{ background: "#2C1A0E", borderRadius: 20, padding: "24px 22px" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A89080", marginBottom: 6 }}>Total earnings</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 44, color: "#FAF7F2", fontWeight: 400, lineHeight: 1 }}>$247<span style={{ fontSize: 24, opacity: 0.6 }}>.80</span></div>
          <div style={{ fontSize: 13, color: "#A89080", marginTop: 6 }}>↑ $38.40 this month · 247 referrals total</div>
          <div style={{ marginTop: 20 }}>
            <button style={{ background: "#8B6347", color: "#FAF7F2", border: "none", borderRadius: 100, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginRight: 10 }}>Request payout</button>
            <span style={{ fontSize: 13, color: "#A89080" }}>Min. $25</span>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Clicks", value: "1,842", sub: "↑ 12% vs last month", up: true },
            { label: "Sign-ups", value: "247", sub: "13.4% conversion", up: null },
            { label: "Pro upgrades", value: "31", sub: "↑ 8 this month", up: true },
            { label: "Avg. commission", value: "$3.18", sub: "per conversion", up: null },
          ].map(s => (
            <div key={s.label} style={{ background: "#EDE4DA", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: "#8B6347", marginBottom: 4, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#2C1A0E" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.up ? "#2A7A3A" : "#8B6347", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ background: "#EDE4DA", borderRadius: 16, padding: "18px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#2C1A0E" }}>Referrals this year</div>
            <div style={{ fontSize: 12, color: "#8B6347" }}>2025</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80 }}>
            {barData.map((val, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ width: "100%", background: i === 11 ? "#8B6347" : "#C4B4A4", borderRadius: 4, height: `${(val / maxBar) * 100}%`, minHeight: 4 }} />
                <span style={{ fontSize: 9, color: "#8B6347", fontWeight: i === 11 ? 700 : 400 }}>{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Affiliate link */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8DDD4", padding: "16px" }}>
          <div style={{ fontSize: 12, color: "#8B6347", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Your affiliate link</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FAF7F2", borderRadius: 10, padding: "10px 14px" }}>
            <span style={{ fontSize: 13, color: "#3D2410", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>coffeebrew.coach/?ref=sarah92</span>
            <button style={{ background: "#2C1A0E", color: "#FAF7F2", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Copy</button>
          </div>
        </div>

        {/* Payout history */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8DDD4", padding: "16px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#2C1A0E", marginBottom: 12 }}>Payout history</div>
          {[
            { date: "Nov 1, 2025", amount: "$82.40", status: "Paid" },
            { date: "Oct 1, 2025", amount: "$61.20", status: "Paid" },
            { date: "Sep 1, 2025", amount: "$45.00", status: "Paid" },
          ].map(p => (
            <div key={p.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F0E8DF" }}>
              <div>
                <div style={{ fontSize: 14, color: "#2C1A0E", fontWeight: 500 }}>{p.amount}</div>
                <div style={{ fontSize: 12, color: "#8B6347" }}>{p.date}</div>
              </div>
              <div style={{ background: "#D4EDDA", borderRadius: 100, padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#2A7A3A" }}>{p.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
