// Scenario: user submitted without water temp — nudge appears below AI advice
export function GearNudge() {
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
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 12px", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, color: "#2C1A0E" }}>Your brew advice</span>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Brew summary pill */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["V60", "Ethiopia Yirgacheffe", "15g", "250ml"].map(tag => (
            <div key={tag} style={{ background: "#EDE4DA", borderRadius: 100, padding: "5px 12px", fontSize: 13, color: "#3D2410", fontWeight: 500 }}>{tag}</div>
          ))}
          <div style={{ background: "#FEE8E8", borderRadius: 100, padding: "5px 12px", fontSize: 13, color: "#9B2C2C", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9B2C2C" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            No temp recorded
          </div>
        </div>

        {/* Tasting notes */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#8B6347", textTransform: "uppercase", letterSpacing: "0.08em", width: "100%", fontWeight: 600, marginBottom: 2 }}>Tasting notes</div>
          {["Sour", "Thin", "Bitter finish"].map(n => (
            <div key={n} style={{ background: "#fff", border: "1.5px solid #E8DDD4", borderRadius: 100, padding: "6px 14px", fontSize: 13, color: "#2C1A0E" }}>{n}</div>
          ))}
        </div>

        {/* AI advice card */}
        <div style={{ background: "#2C1A0E", borderRadius: 20, padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
            <span style={{ fontSize: 13, color: "#A89080", fontWeight: 500 }}>Coffee Coach</span>
          </div>
          <p style={{ fontSize: 16, color: "#FAF7F2", lineHeight: 1.6, margin: 0, marginBottom: 16 }}>
            Your sour and thin cup is a classic sign of under-extraction. Try grinding finer for your next V60 — this slows the flow and pulls more sweetness from the Ethiopia.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", borderRadius: 100, padding: "8px 14px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A89080" strokeWidth="2" strokeLinecap="round"><polyline points="5 12 12 5 19 12"/><line x1="12" y1="19" x2="12" y2="5"/></svg>
            <span style={{ fontSize: 13, color: "#A89080" }}>Adjustment: grind finer</span>
          </div>
        </div>

        {/* ——— GEAR NUDGE ——— */}
        <div style={{ background: "#FFF8F0", border: "1.5px solid #F0D8C0", borderRadius: 20, padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>🌡️</span>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8B6347" }}>Missing data · Water temperature</span>
          </div>
          <p style={{ fontSize: 14, color: "#3D2410", lineHeight: 1.5, margin: "0 0 16px" }}>
            Without tracking water temperature, we can't give you precise advice. A smart kettle lets you hit the exact degree every time.
          </p>

          {/* Product card */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "14px", display: "flex", gap: 14, alignItems: "center", boxShadow: "0 1px 8px rgba(44,26,14,0.07)" }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: "linear-gradient(145deg, #EDE4DA, #D4C4B4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>🫖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2C1A0E", marginBottom: 2 }}>Fellow Stagg EKG</div>
              <div style={{ fontSize: 12, color: "#8B6347", marginBottom: 6 }}>0.1° precision · Hold temp · Variable pour</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 600, color: "#2C1A0E" }}>$165</span>
                <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 10, color: "#F5A623" }}>★</span>)}</div>
                <span style={{ fontSize: 11, color: "#8B6347" }}>4.8 (2.4k)</span>
              </div>
            </div>
          </div>

          <button style={{ width: "100%", marginTop: 12, background: "#8B6347", color: "#FAF7F2", border: "none", borderRadius: 100, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            View on Amazon
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </button>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#B4A090" }}>Affiliate link · We may earn a small commission</div>
        </div>

        {/* Save brew button */}
        <button style={{ width: "100%", background: "#2C1A0E", color: "#FAF7F2", border: "none", borderRadius: 100, padding: "16px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Save this brew →</button>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
