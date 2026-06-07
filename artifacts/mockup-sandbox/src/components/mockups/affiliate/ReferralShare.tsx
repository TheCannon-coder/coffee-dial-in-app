export function ReferralShare() {
  const code = "BREW-K7X2";
  const stats = { friends: 3, brewsUnlocked: 30, pending: 10 };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#FAF7F2", minHeight: "100dvh", width: 390, margin: "0 auto", overflowX: "hidden" }}>

      {/* Status bar */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#2C1A0E" }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#2C1A0E"><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1" opacity=".3"/></svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 2.5C10.2 2.5 12.1 3.5 13.4 5L15 3.3C13.2 1.3 10.8 0 8 0S2.8 1.3 1 3.3L2.6 5C3.9 3.5 5.8 2.5 8 2.5Z" fill="#2C1A0E"/><path d="M8 5.5C9.4 5.5 10.7 6.1 11.6 7.1L13.2 5.4C11.8 3.9 9.9 3 8 3C6.1 3 4.2 3.9 2.8 5.4L4.4 7.1C5.3 6.1 6.6 5.5 8 5.5Z" fill="#2C1A0E"/><circle cx="8" cy="10" r="2" fill="#2C1A0E"/></svg>
          <div style={{ width: 25, height: 12, border: "1.5px solid #2C1A0E", borderRadius: 3, padding: 2, display: "flex", alignItems: "center" }}><div style={{ background: "#2C1A0E", borderRadius: 1.5, height: "100%", width: "75%" }} /></div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 12px", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, color: "#2C1A0E", fontWeight: 400 }}>Refer a friend</span>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Hero message */}
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>☕</div>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 26, color: "#2C1A0E", lineHeight: 1.2, marginBottom: 6 }}>Give 10 brews,<br />get 10 brews.</div>
          <div style={{ fontSize: 14, color: "#8B6347", lineHeight: 1.5 }}>When a friend signs up with your code, they get 10 free brews — and so do you.</div>
        </div>

        {/* Code card */}
        <div style={{ background: "#2C1A0E", borderRadius: 20, padding: "24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A89080", marginBottom: 12, fontWeight: 500 }}>Your referral code</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 38, letterSpacing: "0.12em", color: "#FAF7F2", fontWeight: 400, marginBottom: 20 }}>{code}</div>
          <button style={{ background: "#FAF7F2", color: "#2C1A0E", border: "none", borderRadius: 100, padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy code
          </button>
        </div>

        {/* Share row */}
        <button style={{ background: "#8B6347", color: "#FAF7F2", border: "none", borderRadius: 100, padding: "16px", fontSize: 16, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share your link
        </button>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Friends joined", value: stats.friends },
            { label: "Brews unlocked", value: stats.brewsUnlocked },
            { label: "Pending brews", value: stats.pending },
          ].map(s => (
            <div key={s.label} style={{ background: "#EDE4DA", borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 28, color: "#2C1A0E", fontWeight: 400 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#8B6347", lineHeight: 1.3, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ background: "#EDE4DA", borderRadius: 16, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8B6347", marginBottom: 12, fontWeight: 600 }}>How it works</div>
          {[
            { n: "1", text: "Share your code or link with a coffee-loving friend." },
            { n: "2", text: "They sign up and get 10 extra free brews on us." },
            { n: "3", text: "Once they use their first brew, yours are added too." },
          ].map(step => (
            <div key={step.n} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: 100, background: "#8B6347", color: "#FAF7F2", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{step.n}</div>
              <div style={{ fontSize: 13, color: "#3D2410", lineHeight: 1.5 }}>{step.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
