import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

const mockDb = vi.hoisted(() => ({
  query: {
    referralConversionsTable: { findFirst: vi.fn() },
    affiliatesTable: { findFirst: vi.fn() },
  },
  update: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: mockDb,
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
  processNextInstalment,
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

// ── processNextInstalment ─────────────────────────────────────────────────────

function makeConversion(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    referrerUserId: 7,
    planType: "annual",
    instalmentStatus: "active",
    instalmentTotal: 12,
    instalmentMonthlyAmountCents: 500,
    instalmentsPaid: 0,
    nextPayoutDate: null as string | null,
    ...overrides,
  };
}

function makeAffiliate() {
  return { id: 1, userId: 7, tier: "standard" };
}

/** Build a mock update chain: .update().set().where() → returns { returning: vi.fn() } */
function makeUpdateChain(returningValue?: unknown) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returningValue ? [returningValue] : []),
  };
  return vi.fn().mockReturnValue(chain);
}

/** Build a mock insert chain: .insert().values() → resolves undefined */
function makeInsertChain() {
  const chain = { values: vi.fn().mockResolvedValue(undefined) };
  return vi.fn().mockReturnValue(chain);
}

describe("processNextInstalment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when nextPayoutDate is tomorrow (future date)", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDateStr = tomorrow.toISOString().slice(0, 10);

    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({ nextPayoutDate: futureDateStr }),
    );

    const result = await processNextInstalment(42);

    expect(result).toBe(false);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("returns false when nextPayoutDate is 30 days in the future", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureDateStr = future.toISOString().slice(0, 10);

    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({ nextPayoutDate: futureDateStr }),
    );

    const result = await processNextInstalment(42);

    expect(result).toBe(false);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("processes when nextPayoutDate is today", async () => {
    const today = new Date().toISOString().slice(0, 10);

    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({ nextPayoutDate: today }),
    );
    (mockDb.query.affiliatesTable.findFirst as Mock).mockResolvedValue(makeAffiliate());

    let capturedSet: Record<string, unknown> = {};
    (mockDb.transaction as Mock).mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: makeInsertChain(),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
            capturedSet = vals;
            return { where: vi.fn().mockResolvedValue(undefined) };
          }),
        }),
      };
      await fn(tx);
    });

    const result = await processNextInstalment(42);

    expect(result).toBe(true);
    expect(mockDb.transaction).toHaveBeenCalledOnce();
    expect(capturedSet["instalmentsPaid"]).toBe(1);
  });

  it("processes when nextPayoutDate is in the past", async () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const pastDateStr = past.toISOString().slice(0, 10);

    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({ nextPayoutDate: pastDateStr }),
    );
    (mockDb.query.affiliatesTable.findFirst as Mock).mockResolvedValue(makeAffiliate());

    (mockDb.transaction as Mock).mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: makeInsertChain(),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
      };
      await fn(tx);
    });

    const result = await processNextInstalment(42);

    expect(result).toBe(true);
  });

  it("advances nextPayoutDate by approximately one month", async () => {
    const today = new Date().toISOString().slice(0, 10);

    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({ nextPayoutDate: today, instalmentsPaid: 3 }),
    );
    (mockDb.query.affiliatesTable.findFirst as Mock).mockResolvedValue(makeAffiliate());

    let capturedSet: Record<string, unknown> = {};
    (mockDb.transaction as Mock).mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: makeInsertChain(),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
            capturedSet = vals;
            return { where: vi.fn().mockResolvedValue(undefined) };
          }),
        }),
      };
      await fn(tx);
    });

    await processNextInstalment(42);

    const nextDate = capturedSet["nextPayoutDate"] as string;
    expect(typeof nextDate).toBe("string");

    const todayMs = new Date(today).getTime();
    const nextMs = new Date(nextDate).getTime();
    const diffDays = (nextMs - todayMs) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(27);
    expect(diffDays).toBeLessThanOrEqual(32);
  });

  it("flips instalmentStatus to complete and sets nextPayoutDate to null on the final instalment", async () => {
    const today = new Date().toISOString().slice(0, 10);

    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({
        nextPayoutDate: today,
        instalmentsPaid: 11,
        instalmentTotal: 12,
      }),
    );
    (mockDb.query.affiliatesTable.findFirst as Mock).mockResolvedValue(makeAffiliate());

    let capturedSet: Record<string, unknown> = {};
    (mockDb.transaction as Mock).mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: makeInsertChain(),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
            capturedSet = vals;
            return { where: vi.fn().mockResolvedValue(undefined) };
          }),
        }),
      };
      await fn(tx);
    });

    const result = await processNextInstalment(42);

    expect(result).toBe(true);
    expect(capturedSet["instalmentStatus"]).toBe("complete");
    expect(capturedSet["nextPayoutDate"]).toBeNull();
    expect(capturedSet["instalmentsPaid"]).toBe(12);
  });

  it("returns false (without inserting a ledger entry) if instalmentsPaid already equals instalmentTotal before processing", async () => {
    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({ instalmentsPaid: 12, instalmentTotal: 12 }),
    );

    (mockDb.update as Mock) = makeUpdateChain();

    const result = await processNextInstalment(42);

    expect(result).toBe(false);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("returns false if conversion is not found", async () => {
    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(undefined);

    const result = await processNextInstalment(42);

    expect(result).toBe(false);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("returns false if instalmentStatus is not active", async () => {
    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({ instalmentStatus: "complete" }),
    );

    const result = await processNextInstalment(42);

    expect(result).toBe(false);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("inserts a ledger entry with the correct amount for each processed instalment", async () => {
    const today = new Date().toISOString().slice(0, 10);

    (mockDb.query.referralConversionsTable.findFirst as Mock).mockResolvedValue(
      makeConversion({ nextPayoutDate: today, instalmentMonthlyAmountCents: 750 }),
    );
    (mockDb.query.affiliatesTable.findFirst as Mock).mockResolvedValue(makeAffiliate());

    let capturedInsertValues: Record<string, unknown> = {};
    (mockDb.transaction as Mock).mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
            capturedInsertValues = vals;
            return Promise.resolve();
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
      };
      await fn(tx);
    });

    await processNextInstalment(42);

    expect(capturedInsertValues["amountCents"]).toBe(750);
    expect(capturedInsertValues["commissionType"]).toBe("instalment");
  });
});
