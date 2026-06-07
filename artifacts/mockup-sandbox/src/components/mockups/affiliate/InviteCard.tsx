const friends = [
  { name: "Tom K.", joined: "2d ago", avatar: "🧑‍🍳" },
  { name: "Priya M.", joined: "5d ago", avatar: "👩‍💼" },
  { name: "Dan R.", joined: "2w ago", avatar: "🧔" },
];

const channels = [
  { label: "Copy link", icon: "🔗", bg: "#EDE4DA", fg: "#2C1A0E" },
  { label: "Message", icon: "💬", bg: "#D4EDDA", fg: "#2A7A3A" },
  { label: "WhatsApp", icon: "📱", bg: "#D4F0E8", fg: "#1A7A5A" },
  { label: "More", icon: "···", bg: "#E8E0F4", fg: "#5A3A8A" },
];

export function InviteCard() {
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

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 12px", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, color: "#2C1A0E" }}>Invite friends</span>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Hero share card */}
        <div style={{ background: "linear-gradient(145deg, #2C1A0E 0%, #4A2E18 100%)", borderRadius: 24, padding: "32px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

          <div style={{ fontSize: 48, marginBottom: 12 }}>☕️</div>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 28, color: "#FAF7F2", lineHeight: 1.2, marginBottom: 8 }}>
            Give 10 free brews.<br />Get 10 free brews.
          </div>
          <div style={{ fontSize: 14, color: "#A89080", lineHeight: 1.5, marginBottom: 24 }}>
            Help a friend make better coffee.<br />You both win.
          </div>

          {/* Code pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.1)", borderRadius: 100, padding: "10px 20px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <span style={{ fontFamily: "Georgia, serif", letterSpacing: "0.12em", fontSize: 20, color: "#FAF7F2" }}>BREW-K7X2</span>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)" }} />
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A89080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
          </div>
        </div>

        {/* Share channels */}
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8B6347", fontWeight: 600, marginBottom: 12 }}>Share via</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {channels.map(c => (
              <button key={c.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: c.bg, border: "none", borderRadius: 16, padding: "16px 8px", cursor: "pointer" }}>
                <span style={{ fontSize: 24 }}>{c.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.fg }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Progress towards next reward */}
        <div style={{ background: "#EDE4DA", borderRadius: 16, padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#2C1A0E" }}>Your progress</div>
            <div style={{ fontSize: 13, color: "#8B6347" }}>3 of 5 for bonus reward</div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.08)", borderRadius: 100, height: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg, #8B6347, #C4895A)", borderRadius: 100 }} />
          </div>
          <div style={{ fontSize: 12, color: "#8B6347", marginTop: 8 }}>Refer 2 more friends to unlock a free month of Pro ☕</div>
        </div>

        {/* Friends who joined */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8DDD4", padding: "16px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#2C1A0E", marginBottom: 12 }}>Friends who joined</div>
          {friends.map(f => (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F0E8DF" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{f.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#2C1A0E" }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "#8B6347" }}>Joined {f.joined}</div>
              </div>
              <div style={{ background: "#D4EDDA", borderRadius: 100, padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#2A7A3A" }}>+10 brews</div>
            </div>
          ))}
          <div style={{ textAlign: "center", paddingTop: 12 }}>
            <span style={{ fontSize: 13, color: "#8B6347", cursor: "pointer" }}>See all activity →</span>
          </div>
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
