import { useState } from "react";

const C = {
  espresso: "#2C1A0E",
  cream: "#FAF7F2",
  bg: "#FAF7F2",
  card: "#EFEBE4",
  border: "#E0D5C8",
  muted: "#9A8070",
  accent: "#C07A30",
  secondary: "#E8DFD4",
};

// ── Icons (inline SVG) ───────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.espresso} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
    </svg>
  );
}
function IconGift() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}
function IconDollar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function JoinFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 13, lineHeight: "19px", color: C.muted }}>{text}</span>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AffiliateScreen() {
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [country, setCountry] = useState("US");
  const [ftcChecked, setFtcChecked] = useState(false);

  const qualifyingCount = 3; // demo: 3 of 10 referrals done
  const referralLink = "coffeebrew.coach?ref=ALEX42";

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: C.bg,
      minHeight: "100dvh",
      width: 390,
      margin: "0 auto",
      overflowX: "hidden",
    }}>
      {/* Status bar */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.espresso }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill={C.espresso}>
            <rect x="0" y="3" width="3" height="9" rx="1" />
            <rect x="4.5" y="2" width="3" height="10" rx="1" />
            <rect x="9" y="0" width="3" height="12" rx="1" />
          </svg>
          <div style={{ width: 25, height: 12, border: `1.5px solid ${C.espresso}`, borderRadius: 3, padding: 2, display: "flex", alignItems: "center" }}>
            <div style={{ background: C.espresso, borderRadius: 1.5, height: "100%", width: "80%" }} />
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px 56px", display: "flex", flexDirection: "column" }}>
        {/* Back arrow */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconArrowLeft />
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 28, lineHeight: "34px",
          color: C.espresso, marginBottom: 8,
        }}>
          Refer &amp; Earn
        </div>
        <div style={{ fontSize: 14, lineHeight: "21px", color: C.muted, marginBottom: 24 }}>
          Share Coffee Brew Coach. Friends get 1 month free — you earn rewards.
        </div>

        {/* Referral link card */}
        <div style={{
          borderRadius: 14, border: `1px solid ${C.border}`,
          background: C.card, padding: 14,
          display: "flex", flexDirection: "column", gap: 10,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {referralLink}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                background: C.espresso, borderRadius: 100, padding: "9px 14px",
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 13, color: C.cream, fontWeight: 500,
                border: "none", cursor: "pointer",
              }}
            >
              {copied ? <IconCheck /> : <IconCopy />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button style={{
              background: C.secondary, borderRadius: 100, padding: "9px 14px",
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 13, color: C.espresso, fontWeight: 500,
              border: `1px solid ${C.border}`, cursor: "pointer",
            }}>
              <IconShare />
              Share
            </button>
          </div>
        </div>

        {/* Friend progress card */}
        <div style={{
          borderRadius: 14, border: `1px solid ${C.border}`,
          background: C.card, padding: 16,
          marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <IconGift />
            <span style={{ fontSize: 14, fontWeight: 500, color: C.espresso }}>
              Free Pro forever at 10 referrals
            </span>
          </div>
          {/* Progress bar */}
          <div style={{
            height: 6, borderRadius: 100, background: C.secondary, marginBottom: 10, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 100,
              background: C.accent,
              width: `${(qualifyingCount / 10) * 100}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: "19px", marginBottom: 6 }}>
            {qualifyingCount} of 10 qualifying referrals — {10 - qualifyingCount} more to go
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: "18px" }}>
            A referral qualifies once your friend completes 3 brews. Each qualifying referral also earns you 30 days of Pro.
          </div>
        </div>

        {/* Affiliate join section */}
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 18, color: C.espresso, marginBottom: 14,
        }}>
          Earn cash commissions
        </div>

        {!showForm ? (
          /* Join card */
          <div style={{
            borderRadius: 14, border: `1px solid ${C.border}`,
            background: C.card, padding: 18,
          }}>
            <div style={{ fontSize: 13, lineHeight: "20px", color: C.muted, marginBottom: 18 }}>
              Join the affiliate program to earn a monthly cash commission for every Pro subscriber you bring in — instead of (or in addition to) Pro access credits.
            </div>

            <div style={{ marginBottom: 20 }}>
              <JoinFeature icon={<IconDollar />} text="Monthly cash payouts via Stripe" />
              <JoinFeature icon={<IconLock />} text="Your rate locks in at signup — never retroactively reduced" />
              <JoinFeature icon={<IconTrend />} text="Silver, Gold, and Platinum tiers with higher rates" />
              <JoinFeature icon={<IconGlobe />} text="US and Canada only (more countries coming)" />
            </div>

            <button
              onClick={() => setShowForm(true)}
              style={{
                width: "100%", borderRadius: 100, padding: "14px 0",
                background: C.espresso, color: C.cream,
                fontSize: 15, fontWeight: 500, border: "none", cursor: "pointer",
                marginBottom: 14,
              }}
            >
              Join the affiliate program
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <IconInfo />
              <span style={{ fontSize: 13, color: C.accent }}>How payouts work</span>
            </div>
          </div>
        ) : (
          /* Join form */
          <div style={{
            borderRadius: 14, border: `1px solid ${C.border}`,
            background: C.card, padding: 18,
          }}>
            <div style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 20, color: C.espresso, marginBottom: 20,
            }}>
              Join affiliate program
            </div>

            {/* Country */}
            <div style={{ fontSize: 13, fontWeight: 500, color: C.espresso, marginBottom: 8 }}>Country</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {["US", "CA"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCountry(c)}
                  style={{
                    flex: 1, borderRadius: 100, padding: "10px 0",
                    background: country === c ? C.espresso : C.secondary,
                    color: country === c ? C.cream : C.espresso,
                    fontSize: 14, fontWeight: 500,
                    border: country === c ? "none" : `1px solid ${C.border}`,
                    cursor: "pointer",
                  }}
                >
                  {c === "US" ? "🇺🇸 United States" : "🇨🇦 Canada"}
                </button>
              ))}
            </div>

            {/* Payout email */}
            <div style={{ fontSize: 13, fontWeight: 500, color: C.espresso, marginBottom: 8 }}>
              Payout email (Stripe account)
            </div>
            <input
              type="email"
              placeholder="you@example.com"
              style={{
                width: "100%", borderRadius: 10, padding: "12px 14px",
                border: `1px solid ${C.border}`, background: C.bg,
                fontSize: 14, color: C.espresso,
                fontFamily: "inherit", marginBottom: 16,
                boxSizing: "border-box",
              }}
            />

            {/* FTC checkbox */}
            <div
              onClick={() => setFtcChecked((v) => !v)}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, cursor: "pointer" }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                background: ftcChecked ? C.espresso : "transparent",
                border: `1.5px solid ${ftcChecked ? C.espresso : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {ftcChecked && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, lineHeight: "19px", color: C.muted }}>
                I agree to clearly disclose my affiliate relationship whenever I promote Coffee Brew Coach (FTC requirement).
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1, borderRadius: 100, padding: "13px 0",
                  background: "transparent", color: C.espresso,
                  fontSize: 14, fontWeight: 500,
                  border: `1px solid ${C.border}`, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  flex: 2, borderRadius: 100, padding: "13px 0",
                  background: C.espresso, color: C.cream,
                  fontSize: 14, fontWeight: 500,
                  border: "none", cursor: "pointer",
                  opacity: ftcChecked ? 1 : 0.5,
                }}
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {/* Affiliate enrolled state preview — toggle on to see it */}
        {/* (Not shown by default — this is the new-user / not-yet-enrolled view) */}
      </div>
    </div>
  );
}
