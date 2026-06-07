// Full "Level up your kit" screen — triggered after a few brews with missing data
const gearItems = [
  {
    emoji: "⚖️",
    name: "Coffee scale",
    reason: "You've logged 8 brews without a dose in grams.",
    why: "Without weighing your coffee, your ratio changes every time — making it impossible to recreate a great cup.",
    products: [
      { name: "Timemore Black Mirror", price: "$75", stars: 4.9, reviews: "3.1k", tag: "Best value" },
      { name: "Acaia Pearl", price: "$195", stars: 4.8, reviews: "1.8k", tag: "Pro pick" },
    ],
    color: "#FFF5E8",
    border: "#F0D8B0",
    accent: "#C4895A",
  },
  {
    emoji: "🌡️",
    name: "Temperature kettle",
    reason: "No water temp recorded in any of your brews.",
    why: "Water temperature directly affects extraction. Too hot = bitter. Too cool = sour. A smart kettle solves this.",
    products: [
      { name: "Fellow Stagg EKG", price: "$165", stars: 4.8, reviews: "2.4k", tag: "Our pick" },
      { name: "Bonavita 1L", price: "$49", stars: 4.6, reviews: "5.2k", tag: "Budget" },
    ],
    color: "#F0F8FF",
    border: "#C0D8F0",
    accent: "#4A7AAA",
  },
  {
    emoji: "⚙️",
    name: "Adjustable burr grinder",
    reason: "No grinder settings tracked — we can't tell you how to adjust.",
    why: "Pre-ground or blade-ground coffee is the single biggest limit on brew quality. A burr grinder with settings changes everything.",
    products: [
      { name: "Timemore C3 Pro", price: "$89", stars: 4.7, reviews: "1.2k", tag: "Best value" },
      { name: "Fellow Ode Gen 2", price: "$299", stars: 4.9, reviews: "890", tag: "Top rated" },
    ],
    color: "#F8F0FF",
    border: "#D0C0F0",
    accent: "#6A4AAA",
  },
];

export function GearRecommendations() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#FAF7F2", minHeight: "100dvh", width: 390, margin: "0 auto", overflowX: "hidden" }}>

      {/* Status bar */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#2C1A0E" }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#2C1A0E"><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/></svg>
          <div style={{ width: 25, height: 12, border: "1.5px solid #2C1A0E", borderRadius: 3, padding: 2, display: "flex", alignItems: "center" }}><div style={{ background: "#2C1A0E", borderRadius: 1.5, height: "100%", width: "75%" }} /></div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 4px", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, color: "#2C1A0E" }}>Level up your kit</span>
      </div>

      <div style={{ padding: "8px 20px 0", marginBottom: 4 }}>
        <p style={{ fontSize: 14, color: "#8B6347", lineHeight: 1.5, margin: 0 }}>
          Based on your last 12 brews, these tools would directly improve your advice quality — and your coffee.
        </p>
      </div>

      {/* Gap indicators */}
      <div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
        {[
          { label: "No dose", icon: "⚖️" },
          { label: "No temp", icon: "🌡️" },
          { label: "No grinder", icon: "⚙️" },
        ].map(g => (
          <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FEE8E8", borderRadius: 100, padding: "5px 12px" }}>
            <span style={{ fontSize: 13 }}>{g.icon}</span>
            <span style={{ fontSize: 12, color: "#9B2C2C", fontWeight: 600 }}>{g.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {gearItems.map(item => (
          <div key={item.name} style={{ background: item.color, border: `1.5px solid ${item.border}`, borderRadius: 20, padding: "18px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {item.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2C1A0E" }}>{item.name}</div>
                <div style={{ fontSize: 12, color: item.accent, marginTop: 2, fontWeight: 500 }}>{item.reason}</div>
              </div>
            </div>

            {/* Why */}
            <p style={{ fontSize: 13, color: "#3D2410", lineHeight: 1.55, margin: "0 0 14px", background: "rgba(255,255,255,0.5)", borderRadius: 10, padding: "10px 12px" }}>
              {item.why}
            </p>

            {/* Products */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {item.products.map(p => (
                <div key={p.name} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#2C1A0E" }}>{p.name}</span>
                      <span style={{ background: item.accent, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 100, padding: "2px 7px" }}>{p.tag}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 600, color: "#2C1A0E" }}>{p.price}</span>
                      <div style={{ display: "flex", gap: 1 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 9, color: "#F5A623" }}>★</span>)}</div>
                      <span style={{ fontSize: 11, color: "#8B6347" }}>{p.stars} ({p.reviews})</span>
                    </div>
                  </div>
                  <button style={{ background: item.accent, color: "#fff", border: "none", borderRadius: 100, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    Shop →
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ textAlign: "center", fontSize: 12, color: "#B4A090", lineHeight: 1.6, padding: "4px 0 8px" }}>
          Links are affiliate links. We earn a small commission at no extra cost to you.<br />
          We only recommend gear we genuinely think will help your brewing.
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
