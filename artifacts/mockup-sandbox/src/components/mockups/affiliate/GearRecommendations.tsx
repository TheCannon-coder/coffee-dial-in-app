// Redesigned: coaching-first, no star ratings or "Shop →" buttons
const items = [
  {
    id: "scale",
    emoji: "⚖️",
    missingLabel: "dose in grams",
    limitingAdvice:
      "You haven't logged your dose in grams across 5 recent brews. Without a consistent weight, your coffee-to-water ratio drifts every time — so our advice can only go so far. Once you're weighing your dose, we can tell you exactly what to change.",
    solutionText:
      "Any digital kitchen scale works. If you want something made for the countertop, the Timemore Black Mirror is what most home baristas use — it's accurate to 0.1g and has a built-in timer.",
    productName: "Timemore Black Mirror",
    productPrice: "~$75",
  },
  {
    id: "kettle",
    emoji: "🌡️",
    missingLabel: "water temperature",
    limitingAdvice:
      "You've skipped water temperature 4 times. Temperature is one of the biggest extraction variables — a few degrees separates sour from sweet. Without it, we're guessing half the picture when we give you advice.",
    solutionText:
      "A temperature-controlled kettle lets you set the exact degree and hold it. The Fellow Stagg EKG is the one most specialty baristas use at home — precise, looks good on a counter, and has a gooseneck for better pour control.",
    productName: "Fellow Stagg EKG",
    productPrice: "~$165",
  },
];

export function GearRecommendations() {
  return (
    <div
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: "#FAF7F2",
        minHeight: "100dvh",
        width: 390,
        margin: "0 auto",
        overflowX: "hidden",
      }}
    >
      {/* Status bar */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#2C1A0E" }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#2C1A0E"><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/></svg>
          <div style={{ width: 25, height: 12, border: "1.5px solid #2C1A0E", borderRadius: 3, padding: 2, display: "flex", alignItems: "center" }}>
            <div style={{ background: "#2C1A0E", borderRadius: 1.5, height: "100%", width: "75%" }} />
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px" }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 17, color: "#2C1A0E" }}>
          What's limiting your advice
        </span>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: "4px 24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Intro */}
        <p style={{ fontSize: 15, color: "#8B6347", lineHeight: 1.55, margin: 0 }}>
          We noticed some data you haven't been logging. Here's what it means for your coaching.
        </p>

        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <div style={{ height: 1, background: "#E8DDD4", margin: "4px 0 16px" }} />}

            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{item.emoji}</span>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 19, color: "#2C1A0E" }}>
                No {item.missingLabel}
              </span>
            </div>

            {/* Why it limits advice */}
            <p style={{ fontSize: 15, color: "#2C1A0E", lineHeight: 1.6, margin: "0 0 12px" }}>
              {item.limitingAdvice}
            </p>

            {/* How to solve it — natural product mention */}
            <p style={{ fontSize: 15, color: "#6B4E35", lineHeight: 1.6, margin: "0 0 10px" }}>
              {item.solutionText}
            </p>

            {/* Quiet inline link */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#7B4F2E", borderBottom: "1px solid #C4895A" }}>
                {item.productName}
              </span>
              <span style={{ fontSize: 14, color: "#8B6347" }}>{item.productPrice}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B4F2E" strokeWidth="2.2" strokeLinecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </div>
          </div>
        ))}

        {/* Affiliate note */}
        <p style={{ fontSize: 12, color: "#B4A090", lineHeight: 1.6, margin: "8px 0 0" }}>
          Links above are affiliate links — we earn a small commission at no extra cost to you.
        </p>
      </div>

      {/* Footer */}
      <div style={{ position: "sticky", bottom: 0, background: "#FAF7F2", borderTop: "1px solid #E8DDD4", padding: "12px 20px 32px" }}>
        <button style={{ width: "100%", background: "none", border: "1.5px solid #E8DDD4", borderRadius: 100, padding: "15px", fontSize: 16, color: "#8B6347", cursor: "pointer", fontFamily: "'DM Sans', system-ui" }}>
          Got it, back to home
        </button>
      </div>
    </div>
  );
}
