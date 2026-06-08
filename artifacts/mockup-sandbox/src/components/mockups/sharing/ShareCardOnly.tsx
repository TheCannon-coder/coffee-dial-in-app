// Standalone card export — no modal chrome, just the 1:1 share card for screenshotting

export function ShareCardOnly() {
  const advice = "Your sour cup is classic under-extraction. Try grinding a couple of notches finer — this slows the flow and pulls more sweetness from the Ethiopia.";
  const method = "V60";
  const coffeeName = "Ethiopia Yirgacheffe";

  return (
    <div style={{
      width: 390, height: 390,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#FAF7F2",
    }}>
      <div style={{
        background: "#2C1A0E",
        borderRadius: 20,
        width: 350, height: 350,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "28px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        {/* Decorative rings */}
        <div style={{ position: "absolute", bottom: -60, right: -60, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: -20, right: -20, width: 140, height: 140, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />

        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 100, padding: "5px 12px" }}>
            <span style={{ fontSize: 11, color: "#A89080", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{method}</span>
          </div>
          <span style={{ fontSize: 11, color: "#5A3A20", fontStyle: "italic" }}>{coffeeName}</span>
        </div>

        {/* Middle — advice */}
        <div>
          <div style={{ fontSize: 10, color: "#5A3A20", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 500 }}>My brew coach said</div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, color: "#FAF7F2", lineHeight: 1.65 }}>
            "{advice}"
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", borderRadius: 100, padding: "6px 12px" }}>
            <span style={{ fontSize: 11, color: "#A89080" }}>→ Grind finer</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12, color: "#5A3A20" }}>✦</span>
            <span style={{ fontSize: 11, color: "#5A3A20", fontWeight: 500, letterSpacing: "0.03em" }}>Dial In</span>
          </div>
        </div>
      </div>
    </div>
  );
}
