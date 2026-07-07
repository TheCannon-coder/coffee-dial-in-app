import { describe, it, expect, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {},
  affiliatesTable: {},
  commissionLedgerTable: {},
  commissionPhasesTable: {},
  referralConversionsTable: {},
  usersTable: {},
}));

vi.mock("../logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  resolveRateCents,
  ensureRatesLocked,
  MissingCommissionRateError,
  type AffiliateWithRates,
} from "../affiliate-helpers.js";

// ── resolveRateCents ──────────────────────────────────────────────────────────

describe("resolveRateCents", () => {
  const base: AffiliateWithRates = {
    id: 1,
    tier: "standard",
    customMonthlyRateCents: null,
    customAnnualRateCents: null,
    customLifetimeRateCents: null,
  };

  it("returns the custom monthly rate when set", () => {
    const affiliate = { ...base, customMonthlyRateCents: 150 };
    expect(resolveRateCents(affiliate, "monthly", {})).toBe(150);
  });

  it("returns the custom annual rate when set", () => {
    const affiliate = { ...base, customAnnualRateCents: 900 };
    expect(resolveRateCents(affiliate, "annual", {})).toBe(900);
  });

  it("returns the custom lifetime rate when set", () => {
    const affiliate = { ...base, customLifetimeRateCents: 3600 };
    expect(resolveRateCents(affiliate, "lifetime", {})).toBe(3600);
  });

  it("falls back to globalRates when no custom rate is set", () => {
    const rates = { standard: { monthly: 75, annual: 500, lifetime: 1200 } };
    expect(resolveRateCents(base, "monthly", rates)).toBe(75);
    expect(resolveRateCents(base, "annual", rates)).toBe(500);
    expect(resolveRateCents(base, "lifetime", rates)).toBe(1200);
  });

  it("throws MissingCommissionRateError when no custom rate and globalRates is empty", () => {
    expect(() => resolveRateCents(base, "monthly", {})).toThrow(
      MissingCommissionRateError,
    );
  });

  it("throws MissingCommissionRateError when tier exists in globalRates but planType is absent", () => {
    const rates = { standard: { annual: 500 } };
    expect(() => resolveRateCents(base, "monthly", rates)).toThrow(
      MissingCommissionRateError,
    );
  });

  it("throws MissingCommissionRateError when the affiliate's tier has no entry at all", () => {
    const affiliate = { ...base, tier: "gold" };
    const rates = { standard: { monthly: 75 } };
    expect(() => resolveRateCents(affiliate, "monthly", rates)).toThrow(
      MissingCommissionRateError,
    );
  });

  it("error message contains the tier and planType that were missing", () => {
    const affiliate = { ...base, tier: "silver" };
    let caught: unknown;
    try {
      resolveRateCents(affiliate, "monthly", {});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MissingCommissionRateError);
    const err = caught as MissingCommissionRateError;
    expect(err.tier).toBe("silver");
    expect(err.planType).toBe("monthly");
    expect(err.message).toMatch(/tier="silver"/);
    expect(err.message).toMatch(/planType="monthly"/);
  });

  it("custom rate of 0 is returned as-is (not confused with null)", () => {
    const affiliate = { ...base, customMonthlyRateCents: 0 };
    expect(resolveRateCents(affiliate, "monthly", {})).toBe(0);
  });
});

// ── ensureRatesLocked ─────────────────────────────────────────────────────────

describe("ensureRatesLocked", () => {
  const base: AffiliateWithRates = {
    id: 1,
    tier: "standard",
    customMonthlyRateCents: null,
    customAnnualRateCents: null,
    customLifetimeRateCents: null,
  };

  it("returns the affiliate immediately when already locked (monthly set)", async () => {
    const affiliate = { ...base, customMonthlyRateCents: 75 };
    const result = await ensureRatesLocked(affiliate, {});
    expect(result).toBe(affiliate);
  });

  it("returns the affiliate immediately when already locked (annual set)", async () => {
    const affiliate = { ...base, customAnnualRateCents: 500 };
    const result = await ensureRatesLocked(affiliate, {});
    expect(result).toBe(affiliate);
  });

  it("returns the affiliate immediately when already locked (lifetime set)", async () => {
    const affiliate = { ...base, customLifetimeRateCents: 1200 };
    const result = await ensureRatesLocked(affiliate, {});
    expect(result).toBe(affiliate);
  });

  it("throws MissingCommissionRateError when globalRates is empty and all three are required", async () => {
    await expect(ensureRatesLocked(base, {})).rejects.toThrow(
      MissingCommissionRateError,
    );
  });

  it("throws MissingCommissionRateError for missing required planType when others exist", async () => {
    const rates = { standard: { annual: 500, lifetime: 1200 } };
    await expect(
      ensureRatesLocked(base, rates, { requiredPlanTypes: ["monthly"] }),
    ).rejects.toThrow(MissingCommissionRateError);
  });

  it("throws MissingCommissionRateError when tier is absent from globalRates", async () => {
    const affiliate = { ...base, tier: "gold" };
    const rates = { standard: { monthly: 75 } };
    await expect(
      ensureRatesLocked(affiliate, rates, { requiredPlanTypes: ["monthly"] }),
    ).rejects.toThrow(MissingCommissionRateError);
  });

  it("error properties reflect the missing tier and planType", async () => {
    const affiliate = { ...base, tier: "platinum" };
    let caught: unknown;
    try {
      await ensureRatesLocked(affiliate, {}, { requiredPlanTypes: ["monthly"] });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MissingCommissionRateError);
    const err = caught as MissingCommissionRateError;
    expect(err.tier).toBe("platinum");
    expect(err.message).toMatch(/planType/);
  });

  it("throws naming all missing planTypes when multiple required ones are absent", async () => {
    await expect(ensureRatesLocked(base, {})).rejects.toThrow(
      MissingCommissionRateError,
    );
    let caught: unknown;
    try {
      await ensureRatesLocked(base, {});
    } catch (e) {
      caught = e;
    }
    const err = caught as MissingCommissionRateError;
    expect(err.planType).toMatch(/monthly/);
  });
});
