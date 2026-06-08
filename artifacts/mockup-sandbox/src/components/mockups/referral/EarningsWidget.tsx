import { useState, useEffect, useRef } from "react";

const C = {
  espresso: "#2C1A0E",
  cream: "#FAF7F2",
  tan: "#C8A97A",
  muted: "#8B6347",
};

const COMMISSION  = 1.0;
const CONV_SIGNUP = 0.25;
const CONV_PRO    = 0.18;

// Log scale: slider 0–100 → 1 000–1 000 000
const LOG_MIN = Math.log10(1_000);
const LOG_MAX = Math.log10(1_000_000);
function posToAudience(pos: number) {
  return Math.round(Math.pow(10, LOG_MIN + (pos / 100) * (LOG_MAX - LOG_MIN)));
}
function audienceToPos(audience: number) {
  return ((Math.log10(audience) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
}
function fmtAudience(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(n);
}
function fmtMoney(n: number) {
  if (n >= 10_000) return `$${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000)  return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function useCountUp(target: number, dur = 380) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  const t0   = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    t0.current   = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - t0.current) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(lerp(from, target, e)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return val;
}

const TIERS = [
  { minPro: 0,     emoji: "☕", msg: "A nice bonus on top of your content." },
  { minPro: 50,    emoji: "🔥", msg: "Covers a rent payment every month." },
  { minPro: 250,   emoji: "🚀", msg: "Full-time side income territory." },
  { minPro: 1_000, emoji: "💰", msg: "This is a six-figure business." },
];
function getTier(pro: number) {
  return [...TIERS].reverse().find(t => pro >= t.minPro) ?? TIERS[0];
}

const TICK_POSITIONS = [0, 25, 50, 75, 100];
const TICK_LABELS    = ["1k", "10k", "50k", "250k", "1M"];

export function EarningsWidget() {
  const [pos, setPos] = useState(audienceToPos(50_000));

  const audience = posToAudience(pos);
  const signups  = Math.round(audience * CONV_SIGNUP);
  const pro      = Math.round(signups  * CONV_PRO);
  const monthly  = Math.round(pro * COMMISSION);
  const yearly   = monthly * 12;

  const aSignups  = useCountUp(signups);
  const aPro      = useCountUp(pro);
  const aMonthly  = useCountUp(monthly);
  const aYearly   = useCountUp(yearly);

  const tier = getTier(pro);

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: C.espresso,
      width: 390, minHeight: "100dvh",
      margin: "0 auto",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 28px 48px",
      boxSizing: "border-box",
    }}>
      {/* Wordmark */}
      <div style={{ marginBottom: 28, opacity: 0.4, letterSpacing: "0.15em", fontSize: 11, fontWeight: 700, color: C.cream, textTransform: "uppercase" }}>
        dial in · coffee coach
      </div>

      {/* Headline */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 30, fontStyle: "italic", color: C.cream, lineHeight: 1.15, fontFamily: "Georgia, serif", marginBottom: 10 }}>
          How much could<br />you earn?
        </div>
        <div style={{ fontSize: 14, color: "#A89080", lineHeight: 1.6 }}>
          Earn <strong style={{ color: C.tan }}>$1/month</strong> for every Pro subscriber<br />you bring to Dial In.
        </div>
      </div>

      {/* Slider */}
      <div style={{ width: "100%", marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: "#A89080" }}>My audience reach</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.tan }}>{fmtAudience(audience)}</span>
        </div>
        <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.1)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, #8B6347, ${C.tan})`, width: `${pos}%`, transition: "width 0.08s" }} />
          <div style={{ position: "absolute", top: "50%", transform: "translate(-50%,-50%)", left: `${pos}%`, width: 22, height: 22, borderRadius: "50%", background: C.cream, boxShadow: "0 2px 8px rgba(0,0,0,0.4)", transition: "left 0.08s" }} />
          <input type="range" min={0} max={100} step={0.5} value={pos} onChange={e => setPos(Number(e.target.value))}
            style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%", margin: 0 }} />
        </div>
        {/* Tick marks */}
        <div style={{ position: "relative", marginTop: 10, height: 18 }}>
          {TICK_POSITIONS.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: `${p}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 1, height: 4, background: "rgba(255,255,255,0.2)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{TICK_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
        {([
          { icon: "📣", label: "Audience reached", val: fmtAudience(audience) },
          { icon: "👤", label: `Sign up  (~${(CONV_SIGNUP*100).toFixed(0)}%)`, val: fmtAudience(aSignups) },
          { icon: "⭐", label: `Go Pro  (~${(CONV_PRO*100).toFixed(0)}% of signups)`, val: fmtAudience(aPro) },
        ]).map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px" }}>
            <span style={{ fontSize: 18 }}>{row.icon}</span>
            <span style={{ fontSize: 13, color: "#A89080", flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.cream }}>{row.val}</span>
          </div>
        ))}
      </div>

      {/* Earnings hero */}
      <div style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(200,169,122,0.2)", borderRadius: 20, padding: "24px 22px", textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#A89080", fontWeight: 600, marginBottom: 8 }}>Monthly earnings</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: C.tan, lineHeight: 1 }}>{fmtMoney(aMonthly)}</span>
          <span style={{ fontSize: 15, color: "#A89080", marginBottom: 9 }}>/month</span>
        </div>
        <div style={{ fontSize: 14, color: "#A89080" }}>
          <span style={{ color: C.cream, fontWeight: 700 }}>{fmtMoney(aYearly)}</span> per year
        </div>
      </div>

      {/* Tier */}
      <div style={{ textAlign: "center", marginBottom: 28, minHeight: 58 }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>{tier.emoji}</div>
        <div style={{ fontSize: 14, color: "#C8A97A", fontStyle: "italic" }}>{tier.msg}</div>
      </div>

      {/* CTA */}
      <button style={{ width: "100%", background: C.cream, color: C.espresso, border: "none", borderRadius: 100, padding: "17px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        Get your referral code →
      </button>

      <div style={{ marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", lineHeight: 1.6 }}>
        Paid monthly · No minimum · Conversions based on avg user data
      </div>
    </div>
  );
}
