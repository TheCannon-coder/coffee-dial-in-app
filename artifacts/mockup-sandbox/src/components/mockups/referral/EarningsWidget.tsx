import { useState, useEffect, useRef } from "react";

const C = {
  espresso: "#2C1A0E",
  cream: "#FAF7F2",
  sand: "#EDE4DA",
  tan: "#C8A97A",
  muted: "#8B6347",
  green: "#3A9A4A",
};

const COMMISSION = 1.0;   // $ per Pro user per month (recurring)
const CONV_SIGNUP = 0.25; // % of invites who sign up
const CONV_PRO    = 0.18; // % of signups who go Pro

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function useCountUp(target: number, duration = 400) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  const start = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    start.current = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(lerp(from, target, eased)));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const TIERS = [
  { max: 3,   emoji: "☕", msg: "That's your morning coffee covered." },
  { max: 10,  emoji: "🙌", msg: "A nice little side bonus." },
  { max: 30,  emoji: "🔥", msg: "Real income. Tell your friends!" },
  { max: 100, emoji: "🚀", msg: "This is getting serious." },
  { max: Infinity, emoji: "💰", msg: "You're running a coffee media empire." },
];

function getTier(proCount: number) {
  return TIERS.find(t => proCount < t.max) ?? TIERS[TIERS.length - 1];
}

export function EarningsWidget() {
  const [invites, setInvites] = useState(20);

  const signups    = Math.round(invites * CONV_SIGNUP);
  const proCount   = Math.round(signups * CONV_PRO);
  const monthly    = +(proCount * COMMISSION).toFixed(2);
  const yearly     = +(monthly * 12).toFixed(0);

  const animSignups  = useCountUp(signups);
  const animPro      = useCountUp(proCount);
  const animMonthly  = useCountUp(monthly);
  const animYearly   = useCountUp(yearly);

  const tier = getTier(proCount);
  const pct  = Math.min((invites / 200) * 100, 100);

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: C.espresso,
      width: 390,
      minHeight: "100dvh",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 28px 48px",
      boxSizing: "border-box",
      gap: 0,
    }}>

      {/* Wordmark */}
      <div style={{ marginBottom: 28, opacity: 0.5, letterSpacing: "0.15em", fontSize: 12, fontWeight: 700, color: C.cream, textTransform: "uppercase" }}>
        dial in · coffee coach
      </div>

      {/* Headline */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 30, fontStyle: "italic", color: C.cream, lineHeight: 1.15, fontFamily: "Georgia, 'Times New Roman', serif", marginBottom: 10 }}>
          How much could<br />you earn?
        </div>
        <div style={{ fontSize: 14, color: "#A89080", lineHeight: 1.6 }}>
          Refer friends and earn <strong style={{ color: C.tan }}>$1 per month</strong><br />for every Pro subscriber you bring in.
        </div>
      </div>

      {/* Slider */}
      <div style={{ width: "100%", marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#A89080" }}>I'll share with...</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.tan }}>{invites} {invites === 1 ? "person" : "people"}</span>
        </div>

        {/* Custom slider track */}
        <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.1)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, #8B6347, ${C.tan})`, width: `${pct}%`, transition: "width 0.15s ease" }} />
          <div style={{ position: "absolute", top: "50%", transform: "translate(-50%,-50%)", left: `${pct}%`, width: 22, height: 22, borderRadius: "50%", background: C.cream, boxShadow: "0 2px 8px rgba(0,0,0,0.4)", transition: "left 0.15s ease" }} />
          <input type="range" min={1} max={200} value={invites} onChange={e => setInvites(Number(e.target.value))}
            style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%", margin: 0 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          <span>1</span><span>50</span><span>100</span><span>150</span><span>200</span>
        </div>
      </div>

      {/* Funnel steps */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {[
          { label: "Invites sent", value: invites, icon: "📨", anim: invites },
          { label: "Sign up (~25%)", value: animSignups, icon: "👤", anim: animSignups },
          { label: "Go Pro (~18% of signups)", value: animPro, icon: "⭐", anim: animPro },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px" }}>
            <span style={{ fontSize: 18 }}>{row.icon}</span>
            <span style={{ fontSize: 13, color: "#A89080", flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.cream, fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{row.anim}</span>
          </div>
        ))}
      </div>

      {/* Earnings hero */}
      <div style={{ width: "100%", background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px 22px", textAlign: "center", marginBottom: 20, border: "1px solid rgba(200,169,122,0.2)" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#A89080", fontWeight: 600, marginBottom: 8 }}>Your earnings</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: C.tan, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>${animMonthly}</span>
          <span style={{ fontSize: 16, color: "#A89080", marginBottom: 8 }}>/month</span>
        </div>
        <div style={{ fontSize: 14, color: "#A89080" }}>
          <span style={{ color: C.cream, fontWeight: 600 }}>${animYearly}</span> per year
        </div>
      </div>

      {/* Tier message */}
      {proCount > 0 && (
        <div style={{ textAlign: "center", marginBottom: 28, padding: "0 8px" }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>{tier.emoji}</div>
          <div style={{ fontSize: 14, color: "#C8A97A", fontStyle: "italic" }}>{tier.msg}</div>
        </div>
      )}

      {/* CTA */}
      <a href="https://coffeebrew.coach" style={{ textDecoration: "none", width: "100%" }}>
        <button style={{
          width: "100%",
          background: C.cream,
          color: C.espresso,
          border: "none",
          borderRadius: 100,
          padding: "17px",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}>
          Get your referral code →
        </button>
      </a>

      <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.6 }}>
        Paid monthly. No minimum. Cancel anytime.<br />
        Conversions based on average user data.
      </div>
    </div>
  );
}
