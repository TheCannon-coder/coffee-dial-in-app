// Share modal mockup — platform-specific sharing buttons for Instagram, TikTok, Facebook, X, Reddit
// Reflects the actual ShareModal + ShareCard components in the app

const PLATFORMS = [
  { label: 'Instagram', color: '#C13584', bg: '#C1358418', icon: '📷' },
  { label: 'TikTok',   color: '#010101', bg: '#01010118', icon: '🎵' },
  { label: 'Facebook', color: '#1877F2', bg: '#1877F218', icon: '👍' },
  { label: 'X',        color: '#000000', bg: '#00000018', icon: '𝕏' },
  { label: 'Reddit',   color: '#FF4500', bg: '#FF450018', icon: '👾' },
  { label: 'More',     color: '#8A7A6A', bg: '#8A7A6A18', icon: '···' },
];

export function ShareCard() {
  const advice = "Your sour cup is classic under-extraction. Try grinding a couple of notches finer — this slows the flow and pulls more sweetness from the Ethiopia.";
  const method = "V60";
  const coffeeName = "Ethiopia Yirgacheffe";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#FAF7F2", width: 390, minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* Handle */}
      <div style={{ width: 36, height: 4, background: "#D4C5B0", borderRadius: 2, marginTop: 12 }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "20px 20px 16px", position: "relative" }}>
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18, color: "#2C1A0E" }}>Share this tip</span>
        <div style={{ position: "absolute", right: 20, width: 32, height: 32, borderRadius: "50%", background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B6347" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
      </div>

      <div style={{ padding: "0 20px", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>

        {/* Card preview */}
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
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}>
          {/* Rings */}
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)" }} />
          <div style={{ position: "absolute", bottom: -20, right: -20, width: 140, height: 140, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />

          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 100, padding: "5px 12px" }}>
              <span style={{ fontSize: 12, color: "#A89080", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{method}</span>
            </div>
            <span style={{ fontSize: 12, color: "#5A3A20", fontStyle: "italic" }}>{coffeeName}</span>
          </div>

          {/* Advice */}
          <div>
            <div style={{ fontSize: 11, color: "#5A3A20", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 500 }}>My brew coach said</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 17, color: "#FAF7F2", lineHeight: 1.6 }}>
              "{advice}"
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", borderRadius: 100, padding: "6px 12px" }}>
              <span style={{ fontSize: 12, color: "#A89080" }}>→ Grind finer</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13, color: "#5A3A20" }}>✦</span>
              <span style={{ fontSize: 12, color: "#5A3A20", fontWeight: 500 }}>Dial In</span>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p style={{ margin: 0, fontSize: 13, color: "#A89080", textAlign: "center", lineHeight: 1.5, paddingInline: 16 }}>
          For image-based apps the card is saved to your Photos first.
        </p>

        {/* Platform grid — 6 icons */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, width: "100%" }}>
          {PLATFORMS.map(p => (
            <div key={p.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 76 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: p.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: p.label === 'X' ? 20 : 22,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}>
                {/* SVG icons for the real platforms */}
                {p.label === 'Instagram' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={p.color}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                )}
                {p.label === 'TikTok' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={p.color}><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34v-7a8.19 8.19 0 0 0 4.79 1.52V6.38a4.85 4.85 0 0 1-1.02-.31z"/></svg>
                )}
                {p.label === 'Facebook' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={p.color}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                )}
                {p.label === 'X' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={p.color}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                )}
                {p.label === 'Reddit' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={p.color}><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                )}
                {p.label === 'More' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.2" strokeLinecap="round"><circle cx="5" cy="12" r="1.5" fill={p.color}/><circle cx="12" cy="12" r="1.5" fill={p.color}/><circle cx="19" cy="12" r="1.5" fill={p.color}/></svg>
                )}
              </div>
              <span style={{ fontSize: 12, color: "#A89080" }}>{p.label}</span>
            </div>
          ))}
        </div>

        {/* Save to camera roll */}
        <button style={{
          display: "flex", alignItems: "center", gap: 8,
          border: "1.5px solid #D4C5B0", borderRadius: 100,
          background: "none", padding: "12px 20px",
          fontSize: 14, color: "#2C1A0E", cursor: "pointer",
          fontFamily: "'DM Sans', system-ui", fontWeight: 500,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Save card to Photos
        </button>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
