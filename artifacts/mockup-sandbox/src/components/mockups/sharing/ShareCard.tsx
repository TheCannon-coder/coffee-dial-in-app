// Share card mockup — what users will see before sharing to Instagram/TikTok
// Square 1:1 ratio, dark espresso background, designed for social sharing

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'Grind finer',
  grind_coarser: 'Grind coarser',
  more_coffee: 'Use more coffee',
  less_coffee: 'Use less coffee',
  steep_longer: 'Steep longer',
  steep_shorter: 'Steep shorter',
  none: 'Leave it as-is',
};

export function ShareCard() {
  const method = "V60";
  const coffeeName = "Ethiopia Yirgacheffe";
  const advice = "Your sour cup is classic under-extraction. Try grinding a couple of notches finer — this slows the flow and pulls more sweetness from the Ethiopia.";
  const adjustment = "grind_finer";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#1A0F08", width: 390, minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 0 40px" }}>

      {/* Nav context */}
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 20px 12px" }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FAF7F2" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 17, color: "#A89080" }}>Your result</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Advice card — exactly what's in the app */}
      <div style={{ padding: "0 20px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ background: "#2C1A0E", borderRadius: 20, padding: "22px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#8B6347", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Our next brew tip</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#FAF7F2", lineHeight: 1.55, marginBottom: 16 }}>{advice}</div>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.08)", borderRadius: 100, padding: "8px 14px" }}>
            <span style={{ fontSize: 14, color: "#A89080" }}>→ {ADJUSTMENT_LABELS[adjustment]}</span>
          </div>
        </div>

        {/* Share button */}
        <button
          style={{
            width: "100%",
            background: "none",
            border: "1.5px solid rgba(255,255,255,0.15)",
            borderRadius: 100,
            padding: "14px",
            fontSize: 15,
            color: "#FAF7F2",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: "'DM Sans', system-ui",
            fontWeight: 500,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAF7F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share this tip
        </button>
      </div>

      {/* ─── SHARE CARD PREVIEW (what gets shared) ─── */}
      <div style={{ padding: "24px 20px 0", width: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: 11, color: "#5A3A20", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>Preview · what you're sharing</div>

        {/* The actual share card — 1:1 square */}
        <div style={{
          background: "#2C1A0E",
          borderRadius: 20,
          width: "100%",
          aspectRatio: "1 / 1",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "28px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle decorative circle */}
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)" }} />
          <div style={{ position: "absolute", bottom: -20, right: -20, width: 140, height: 140, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }} />

          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>☕</span>
              <span style={{ fontSize: 13, color: "#A89080", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{method}</span>
            </div>
            <span style={{ fontSize: 12, color: "#5A3A20", fontStyle: "italic" }}>{coffeeName}</span>
          </div>

          {/* Advice — the main content */}
          <div>
            <div style={{ fontSize: 11, color: "#5A3A20", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>My brew coach said</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 19, color: "#FAF7F2", lineHeight: 1.6 }}>
              "{advice}"
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", borderRadius: 100, padding: "7px 12px" }}>
              <span style={{ fontSize: 12, color: "#A89080" }}>→ {ADJUSTMENT_LABELS[adjustment]}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>✦</span>
              <span style={{ fontSize: 12, color: "#5A3A20", fontWeight: 600 }}>Dial In</span>
            </div>
          </div>
        </div>

        {/* Share sheet actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {["Instagram", "Copy image", "More…"].map((label, i) => (
            <button key={label} style={{
              flex: 1,
              background: i === 0 ? "linear-gradient(135deg, #833ab4, #fd1d1d, #f77737)" : "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: 12,
              padding: "12px 0",
              fontSize: 12,
              color: "#FAF7F2",
              cursor: "pointer",
              fontFamily: "'DM Sans', system-ui",
              fontWeight: 500,
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
