// Shows the brew setup screen with contextual product hints next to empty/imprecise fields
type HintProps = { emoji: string; text: string; product: string };
function Hint({ emoji, text, product }: HintProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <span style={{ fontSize: 12, color: "#8B6347", lineHeight: 1.4, flex: 1 }}>{text}</span>
      <button style={{ background: "none", border: "1.5px solid #C4A080", borderRadius: 100, padding: "3px 10px", fontSize: 11, color: "#8B6347", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
        {product} →
      </button>
    </div>
  );
}

type FieldProps = { label: string; placeholder: string; value?: string; hint?: HintProps; required?: boolean };
function Field({ label, placeholder, value, hint, required }: FieldProps) {
  const isEmpty = !value;
  const isImprecise = value && !value.match(/\d/);
  const showHint = hint && (isEmpty || isImprecise);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#2C1A0E" }}>
          {label}{required && <span style={{ color: "#8B6347", marginLeft: 3 }}>*</span>}
        </label>
        {isEmpty && <span style={{ fontSize: 11, color: "#B4A090" }}>optional</span>}
      </div>
      <div style={{
        background: "#fff",
        border: `1.5px solid ${showHint ? "#F0D8C0" : isEmpty ? "#E8DDD4" : "#C4A890"}`,
        borderRadius: 14,
        padding: "13px 16px",
        fontSize: 15,
        color: value ? "#2C1A0E" : "#B4A090",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span>{value || placeholder}</span>
        {!isEmpty && !isImprecise && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A7A3A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )}
        {showHint && <span style={{ fontSize: 16 }}>{hint.emoji}</span>}
      </div>
      {showHint && (
        <Hint {...hint} />
      )}
    </div>
  );
}

export function SetupSmartHints() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#FAF7F2", minHeight: "100dvh", width: 390, margin: "0 auto", overflowX: "hidden" }}>

      {/* Status bar */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#2C1A0E" }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#2C1A0E"><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/></svg>
          <div style={{ width: 25, height: 12, border: "1.5px solid #2C1A0E", borderRadius: 3, padding: 2, display: "flex", alignItems: "center" }}><div style={{ background: "#2C1A0E", borderRadius: 1.5, height: "100%", width: "75%" }} /></div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#EDE4DA", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, color: "#2C1A0E" }}>Log your brew</span>
        </div>
        <span style={{ fontSize: 14, color: "#8B6347" }}>V60</span>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Coffee name — filled */}
        <Field
          label="Coffee name"
          placeholder="e.g. Ethiopia Yirgacheffe"
          value="Ethiopia Yirgacheffe"
        />

        {/* Dose — imprecise (text, no grams) */}
        <Field
          label="Dose"
          placeholder="e.g. 15g"
          value="a big scoop"
          hint={{
            emoji: "⚖️",
            text: "Grams are more precise — even a cheap scale transforms consistency.",
            product: "Scale",
          }}
        />

        {/* Water — filled */}
        <Field
          label="Water"
          placeholder="e.g. 250ml"
          value="250ml"
        />

        {/* Water temp — empty */}
        <Field
          label="Water temperature"
          placeholder="e.g. 93°C"
          hint={{
            emoji: "🌡️",
            text: "Track temp for better advice. A smart kettle hits the exact degree.",
            product: "Kettle",
          }}
        />

        {/* Grinder notes — empty */}
        <Field
          label="Grinder / setting"
          placeholder="e.g. Timemore C3, 18 clicks"
          hint={{
            emoji: "⚙️",
            text: "Dial-in works best when you can adjust grind settings precisely.",
            product: "Grinder",
          }}
        />

        {/* Brew time — filled */}
        <Field
          label="Brew time"
          placeholder="e.g. 3:30"
          value="3:12"
        />

        {/* Info banner */}
        <div style={{ background: "#EDE4DA", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <div style={{ fontSize: 13, color: "#5A3A20", lineHeight: 1.5 }}>
            The more you log, the more specific your brewing advice will be. Missing fields reduce accuracy.
          </div>
        </div>

        <button style={{ background: "#2C1A0E", color: "#FAF7F2", border: "none", borderRadius: 100, padding: "16px", fontSize: 16, fontWeight: 600, cursor: "pointer", width: "100%" }}>
          Continue to tasting →
        </button>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
