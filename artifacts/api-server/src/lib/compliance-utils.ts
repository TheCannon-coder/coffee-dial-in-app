/**
 * Affiliate compliance utilities — country routing, withholding rules,
 * regulatory reporting obligations.
 *
 * All logic is pure (no DB access) so it can be tested in isolation and
 * reused across routes.
 */

// ── EU member states (DAC7 / GDPR scope) ─────────────────────────────────────

export const EU_MEMBER_STATES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
  "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL",
  "PT", "RO", "SE", "SI", "SK",
]);

// ── Tax form routing ──────────────────────────────────────────────────────────

/**
 * US affiliates use IRS W-9.
 * All others use IRS W-8BEN to certify foreign status — this removes any US
 * withholding obligation on our side and shifts tax responsibility to the
 * affiliate's home country.
 */
export function getRequiredTaxForm(country: string): "w9" | "w8ben" {
  return country.toUpperCase() === "US" ? "w9" : "w8ben";
}

// ── Country-specific requirements ─────────────────────────────────────────────

/** EU member states and the UK require GDPR consent at signup. */
export function requiresGdprConsent(country: string): boolean {
  const c = country.toUpperCase();
  return EU_MEMBER_STATES.has(c) || c === "GB";
}

/** Australian affiliates must provide an ABN; missing → 47% withholding. */
export function isAustralian(country: string): boolean {
  return country.toUpperCase() === "AU";
}

/** Canadian affiliates must provide a SIN or Business Number for T4A filing. */
export function isCanadian(country: string): boolean {
  return country.toUpperCase() === "CA";
}

/** EU member state → subject to DAC7 reporting obligations. */
export function isEuMemberState(country: string): boolean {
  return EU_MEMBER_STATES.has(country.toUpperCase());
}

// ── Withholding rules ─────────────────────────────────────────────────────────

/**
 * Returns the withholding rate percentage to apply before payout.
 *
 * Rules:
 * - AU without ABN: 47% (ATO top marginal rate for non-registered entities)
 * - All others: 0% (W-8BEN certification shifts tax responsibility to affiliate)
 */
export function getWithholdingRatePct(country: string, hasAbn: boolean): number {
  if (country.toUpperCase() === "AU" && !hasAbn) return 47;
  return 0;
}

// ── DAC7 / EUR conversion ─────────────────────────────────────────────────────

/**
 * Converts USD cents to EUR cents for DAC7 threshold monitoring.
 * Rate is configurable via EUR_USD_RATE env var (e.g. "0.92").
 * Defaults to 0.92 if not set.
 *
 * DAC7 reporting threshold: EUR €2,000 gross proceeds per seller per year.
 */
export function usdCentsToEurCents(usdCents: number): number {
  const rate = parseFloat(process.env["EUR_USD_RATE"] ?? "0.92");
  return Math.floor(usdCents * rate);
}

// ── T4A threshold ─────────────────────────────────────────────────────────────

/**
 * Conservative USD equivalent of CAD $500 T4A threshold.
 * Uses CAD_USD_RATE env var (e.g. "0.74"). Defaults to 0.74.
 * Returns threshold in USD cents.
 *
 * Used to flag Canadian affiliates who may require a T4A slip.
 */
export function t4aThresholdUsdCents(): number {
  const rate = parseFloat(process.env["CAD_USD_RATE"] ?? "0.74");
  return Math.floor(500 * rate * 100); // CAD $500 → USD cents
}

// ── Validation helpers ────────────────────────────────────────────────────────

const ABN_RE = /^\d{11}$/;
const SIN_RE = /^\d{9}$|^\d{3}-\d{3}-\d{3}$/;
const BN_RE = /^\d{9}(RT|RP|RC|RZ)\d{4}$/i;

export function isValidAbn(abn: string): boolean {
  return ABN_RE.test(abn.replace(/\s/g, ""));
}

export function isValidSinOrBn(value: string): boolean {
  const v = value.replace(/\s/g, "");
  return SIN_RE.test(v) || BN_RE.test(v);
}
