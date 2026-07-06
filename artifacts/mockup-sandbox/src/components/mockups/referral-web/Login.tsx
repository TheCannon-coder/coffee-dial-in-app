export function Login() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#FAF7F2", minHeight: "100dvh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: 420, background: "#fff", borderRadius: 24, border: "1px solid #E8DDD4", padding: "40px 36px", boxShadow: "0 20px 60px rgba(44,26,14,0.08)" }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "#2C1A0E", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FAF7F2" strokeWidth="1.8"><path d="M3 8h14a3 3 0 0 1 0 6h-1" strokeLinecap="round"/><path d="M3 8v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V8" strokeLinecap="round"/><path d="M6 3c-.5 1 .5 1.5 0 2.5M9.5 3c-.5 1 .5 1.5 0 2.5" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 24, color: "#2C1A0E" }}>Partner Dashboard</div>
          <div style={{ fontSize: 13, color: "#8B6347", marginTop: 4 }}>Dial In — Coffee Coach</div>
        </div>

        {/* Value line */}
        <div style={{ fontSize: 14, color: "#5A4030", textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>
          Sign in with the same account you use in the app — no new password to remember.
        </div>

        {/* Social buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#000", color: "#fff", border: "none", borderRadius: 12, padding: "13px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            <svg width="16" height="19" viewBox="0 0 16 19" fill="currentColor"><path d="M13.2 10.1c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.6 0-1.7-.8-2.7-.7-1.4 0-2.7.8-3.4 2-1.5 2.5-.4 6.2 1 8.2.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7s1.6.7 2.7.6c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.3v-.8zM11 3.5c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.8-.4 2.3-1.1z"/></svg>
            Continue with Apple
          </button>
          <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", color: "#2C1A0E", border: "1px solid #E0D5C8", borderRadius: 12, padding: "13px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.9 2.1-1.8 2.7v2.3h3a8.8 8.8 0 0 0 2.6-6.6z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.3c-.8.6-1.9.9-3 .9-2.3 0-4.3-1.6-5-3.7H1v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M4 10.7c-.2-.6-.3-1.2-.3-1.7s.1-1.2.3-1.7V4.9H1a9 9 0 0 0 0 8.1l3-2.3z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.4 3.4 1.3l2.6-2.6C13.5.9 11.4 0 9 0A9 9 0 0 0 1 4.9l3 2.4C4.7 5.2 6.7 3.6 9 3.6z"/></svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#EDE4DA" }} />
          <span style={{ fontSize: 12, color: "#A89080" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#EDE4DA" }} />
        </div>

        {/* Email magic link */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#8B6347", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email me a login link</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input readOnly value="sarah92@gmail.com" style={{ flex: 1, background: "#FAF7F2", border: "1px solid #E8DDD4", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#2C1A0E" }} />
            <button style={{ background: "#2C1A0E", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Send link</button>
          </div>
          <div style={{ fontSize: 12, color: "#A89080", marginTop: 8 }}>We'll email a one-time link — no password required. Link expires in 15 minutes.</div>
        </div>

        {/* App handoff note */}
        <div style={{ marginTop: 24, background: "#FAF7F2", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6347" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M11 18h2" strokeLinecap="round"/></svg>
          <div style={{ fontSize: 12.5, color: "#8B6347", lineHeight: 1.5 }}>
            <strong style={{ color: "#5A4030" }}>Fastest way in:</strong> tap "My Dashboard" inside the Dial In app — it opens this page already signed in, even if you joined with Apple or Google.
          </div>
        </div>
      </div>
    </div>
  );
}
