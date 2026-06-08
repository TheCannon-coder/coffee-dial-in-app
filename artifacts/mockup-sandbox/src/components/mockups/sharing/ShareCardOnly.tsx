// Full-resolution 1080×1080 export card — crisp at Instagram size

export function ShareCardOnly() {
  const advice = "Your sour cup is classic under-extraction. Try grinding a couple of notches finer — this slows the flow and pulls more sweetness from the Ethiopia.";
  const method = "V60";
  const coffeeName = "Ethiopia Yirgacheffe";

  return (
    <div style={{
      width: 1080,
      height: 1080,
      background: "#2C1A0E",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "88px",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Decorative rings */}
      <div style={{ position: "absolute", bottom: -185, right: -185, width: 680, height: 680, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.04)" }} />
      <div style={{ position: "absolute", bottom: -60, right: -60, width: 430, height: 430, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.06)" }} />

      {/* Top row — method pill + coffee name */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 100, padding: "16px 36px" }}>
          <span style={{
            fontSize: 34,
            color: "#A89080",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>{method}</span>
        </div>
        <span style={{
          fontSize: 30,
          color: "#5A3A20",
          fontStyle: "italic",
          maxWidth: 440,
          textAlign: "right",
        }}>{coffeeName}</span>
      </div>

      {/* Middle — advice */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{
          fontSize: 26,
          color: "#5A3A20",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 500,
        }}>My brew coach said</div>
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 52,
          color: "#FAF7F2",
          lineHeight: 1.55,
        }}>"{advice}"</div>
      </div>

      {/* Bottom row — adjustment pill + brand */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 100,
          padding: "18px 36px",
        }}>
          <span style={{ fontSize: 32, color: "#A89080" }}>→ Grind finer</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 40, color: "#5A3A20" }}>✦</span>
          <span style={{
            fontSize: 32,
            color: "#5A3A20",
            fontWeight: 500,
            letterSpacing: "0.05em",
          }}>Dial In</span>
        </div>
      </div>
    </div>
  );
}
