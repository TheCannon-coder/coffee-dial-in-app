import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from "vitest";
import request from "supertest";

// ── Module mocks ──────────────────────────────────────────────────────────────
// vi.mock calls are hoisted. Factories must be fully self-contained
// (no references to variables defined in this file's outer scope).

vi.mock("@workspace/db", () => {
  const tableNames = [
    "affiliatesTable",
    "commissionLedgerTable",
    "commissionPhasesTable",
    "payoutBatchesTable",
    "referralConversionsTable",
    "taxRecordsTable",
    "usersTable",
    "promoCodesTable",
    "promoCodeRedemptionsTable",
    "gearProductsTable",
  ];
  const mod: Record<string, unknown> = {
    db: {
      query: {
        payoutBatchesTable: { findFirst: vi.fn() },
        affiliatesTable: { findFirst: vi.fn() },
        referralConversionsTable: { findFirst: vi.fn() },
      },
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    },
    GEAR_EXPERIENCE_LEVELS: [] as string[],
  };
  tableNames.forEach((t) => (mod[t] = { [t]: true }));
  return mod;
});

// Keep MissingCommissionRateError real (instanceof checks in the route depend on it).
// Override async functions with vi.fn() so tests can control their return values.
vi.mock("../../lib/affiliate-helpers.js", async (importOriginal) => {
  const real =
    await importOriginal<typeof import("../../lib/affiliate-helpers.js")>();
  return {
    ...real,
    getCurrentRates: vi.fn(),
    promoteAffiliateTierIfEligible: vi.fn(),
    ensureRatesLocked: vi.fn(),
    resolveRateCents: vi.fn(),
    assertRateWillExistForConversion: vi.fn(),
  };
});

vi.mock("../../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../lib/stripe.js", () => ({ getStripe: vi.fn() }));

vi.mock("../../lib/compliance-utils.js", () => ({
  usdCentsToEurCents: (c: number) => Math.round(c * 0.92),
  isEuMemberState: vi.fn().mockReturnValue(false),
}));

vi.mock("../../lib/gear-recommend-cache.js", () => ({
  invalidateGearRecommendCache: vi.fn(),
}));

vi.mock("../../lib/affiliate-session.js", () => ({
  requireAffiliateAuth: vi.fn(
    (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { db } from "@workspace/db";
import {
  getCurrentRates,
  promoteAffiliateTierIfEligible,
  ensureRatesLocked,
  resolveRateCents,
  MissingCommissionRateError,
} from "../../lib/affiliate-helpers.js";
import { default as adminRouter } from "../admin.js";
import express from "express";

// ── Chainable Drizzle mock helpers ────────────────────────────────────────────

function buildSelectChain(resolveWith: unknown): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  ["from", "innerJoin", "leftJoin", "orderBy", "limit", "offset"].forEach(
    (m) => (chain[m] = () => chain),
  );
  chain["where"] = () => Promise.resolve(resolveWith);
  chain["then"] = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(resolveWith).then(resolve, reject);
  return chain;
}

function buildInsertChain(resolveWith: unknown[] = []): Record<string, unknown> {
  const valuesResult: Record<string, unknown> = {
    returning: () => Promise.resolve(resolveWith),
    then: (
      resolve: (v: unknown) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(resolveWith).then(resolve, reject),
  };
  return { values: () => valuesResult };
}

function buildUpdateChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  ["set", "where"].forEach((m) => (chain[m] = () => chain));
  chain["returning"] = () => Promise.resolve([]);
  chain["then"] = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve([]).then(resolve, reject);
  return chain;
}

// Typed helpers for manipulating the mocked db
type MockedDb = {
  query: {
    payoutBatchesTable: { findFirst: ReturnType<typeof vi.fn> };
    affiliatesTable: { findFirst: ReturnType<typeof vi.fn> };
  };
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function getDb(): MockedDb {
  return db as unknown as MockedDb;
}

// ── Test app factory ──────────────────────────────────────────────────────────

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", adminRouter);
  return app;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PERIOD_MONTH = "2026-06";
const ADMIN_KEY = "test-admin-key";

const activeMonthlyConversion = {
  conversionId: 42,
  referrerUserId: 10,
  affiliateId: 5,
  tier: "standard",
  customMonthlyRateCents: null as null,
  customAnnualRateCents: null as null,
  customLifetimeRateCents: null as null,
  affiliatePayoutEmail: "affiliate@example.com",
  affiliatePayoutMethod: "stripe_connect",
};

const affiliateRow = {
  id: 5,
  tier: "standard",
  customMonthlyRateCents: null,
  customAnnualRateCents: null,
  customLifetimeRateCents: null,
  userId: 10,
};

const batchRow = {
  id: 1,
  periodMonth: PERIOD_MONTH,
  status: "draft",
  totalAmountCents: 0,
  affiliateCount: 0,
  notes: null,
  processableAfter: null,
  createdAt: new Date().toISOString(),
};

function setupDbForSkippedEntry() {
  const mdb = getDb();
  mdb.query.payoutBatchesTable.findFirst.mockResolvedValue(null);
  mdb.query.affiliatesTable.findFirst.mockResolvedValue(affiliateRow);
  mdb.select
    .mockReturnValueOnce(buildSelectChain([activeMonthlyConversion])) // activeMonthly
    .mockReturnValueOnce(buildSelectChain([]))                         // existingEntries
    .mockReturnValue(buildSelectChain([]));                            // allPeriodEntries
  mdb.insert.mockReturnValue(buildInsertChain([batchRow]));
  mdb.update.mockReturnValue(buildUpdateChain());
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env["ADMIN_KEY"] = ADMIN_KEY;
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  delete process.env["RESEND_API_KEY"];
  delete process.env["ADMIN_EMAIL"];
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/payouts/generate — missing rate guard", () => {
  it("includes the affected entry in skippedEntries when ensureRatesLocked throws MissingCommissionRateError", async () => {
    setupDbForSkippedEntry();
    vi.mocked(getCurrentRates).mockResolvedValue({});
    vi.mocked(promoteAffiliateTierIfEligible).mockResolvedValue({
      promoted: false,
    });
    vi.mocked(ensureRatesLocked).mockRejectedValue(
      new MissingCommissionRateError("standard", "monthly"),
    );

    const res = await request(createApp())
      .post("/api/admin/payouts/generate")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ periodMonth: PERIOD_MONTH });

    expect(res.status).toBe(200);
    expect(res.body.skippedEntries).toHaveLength(1);
    expect(res.body.skippedEntries[0]).toMatchObject({
      conversionId: activeMonthlyConversion.conversionId,
      affiliateUserId: activeMonthlyConversion.referrerUserId,
      tier: activeMonthlyConversion.tier,
    });
    expect(res.body.skippedEntries[0].reason).toMatch(/standard/);
    expect(res.body.skippedEntries[0].reason).toMatch(/monthly/);
  });

  it("does not insert a ledger row for the skipped entry (no $0 row)", async () => {
    setupDbForSkippedEntry();
    vi.mocked(getCurrentRates).mockResolvedValue({});
    vi.mocked(promoteAffiliateTierIfEligible).mockResolvedValue({
      promoted: false,
    });
    vi.mocked(ensureRatesLocked).mockRejectedValue(
      new MissingCommissionRateError("standard", "monthly"),
    );

    await request(createApp())
      .post("/api/admin/payouts/generate")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ periodMonth: PERIOD_MONTH });

    // db.insert should be called at most once — for the payout batch row itself.
    // It must never be called with commissionLedgerTable for the skipped entry.
    const mdb = getDb();
    const commissionLedgerCalls = mdb.insert.mock.calls.filter(([table]) => {
      return (
        table !== null &&
        typeof table === "object" &&
        "commissionLedgerTable" in (table as object)
      );
    });
    expect(commissionLedgerCalls).toHaveLength(0);
  });

  it("returns newEntriesCreated = 0 when all entries are skipped", async () => {
    setupDbForSkippedEntry();
    vi.mocked(getCurrentRates).mockResolvedValue({});
    vi.mocked(promoteAffiliateTierIfEligible).mockResolvedValue({
      promoted: false,
    });
    vi.mocked(ensureRatesLocked).mockRejectedValue(
      new MissingCommissionRateError("standard", "monthly"),
    );

    const res = await request(createApp())
      .post("/api/admin/payouts/generate")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ periodMonth: PERIOD_MONTH });

    expect(res.body.newEntriesCreated).toBe(0);
  });

  it("returns 401 when no admin key is provided", async () => {
    const res = await request(createApp())
      .post("/api/admin/payouts/generate")
      .send({ periodMonth: PERIOD_MONTH });

    expect(res.status).toBe(401);
  });

  it("returns 400 for a malformed periodMonth", async () => {
    const res = await request(createApp())
      .post("/api/admin/payouts/generate")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ periodMonth: "not-a-month" });

    expect(res.status).toBe(400);
  });

  it("happy path — inserts ledger row and returns empty skippedEntries when a valid rate exists", async () => {
    const rates = { standard: { monthly: 75 } };
    vi.mocked(getCurrentRates).mockResolvedValue(rates);
    vi.mocked(promoteAffiliateTierIfEligible).mockResolvedValue({
      promoted: false,
    });
    const lockedAffiliate = { ...affiliateRow, customMonthlyRateCents: 75 };
    vi.mocked(ensureRatesLocked).mockResolvedValue(lockedAffiliate);
    vi.mocked(resolveRateCents).mockReturnValue(75);

    const ledgerEntry = {
      id: 99,
      affiliateUserId: 10,
      conversionId: 42,
      periodMonth: PERIOD_MONTH,
      planType: "monthly",
      commissionType: "recurring",
      amountCents: 75,
      tier: "standard",
      status: "pending",
      payoutEmail: "affiliate@example.com",
      payoutMethod: "stripe_connect",
      affiliateEmail: "user@example.com",
    };

    const mdb = getDb();
    mdb.query.payoutBatchesTable.findFirst.mockResolvedValue(null);
    mdb.query.affiliatesTable.findFirst.mockResolvedValue(affiliateRow);
    mdb.select
      .mockReturnValueOnce(buildSelectChain([activeMonthlyConversion])) // activeMonthly
      .mockReturnValueOnce(buildSelectChain([]))                         // existingEntries
      .mockReturnValue(buildSelectChain([ledgerEntry]));                 // allPeriodEntries
    mdb.insert
      .mockReturnValueOnce(buildInsertChain([]))       // commissionLedger insert
      .mockReturnValue(buildInsertChain([batchRow]));  // payout batch insert
    mdb.update.mockReturnValue(buildUpdateChain());

    const res = await request(createApp())
      .post("/api/admin/payouts/generate")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ periodMonth: PERIOD_MONTH });

    expect(res.status).toBe(200);
    expect(res.body.skippedEntries).toHaveLength(0);
    expect(res.body.newEntriesCreated).toBe(1);
    expect(res.body.lineItems).toHaveLength(1);
    expect(res.body.lineItems[0].amountCents).toBe(75);
  });
});

describe("POST /api/admin/payouts/generate — skip alert email", () => {
  it("fires a Resend alert when RESEND_API_KEY + ADMIN_EMAIL are set and entries are skipped", async () => {
    process.env["RESEND_API_KEY"] = "re_test_key";
    process.env["ADMIN_EMAIL"] = "admin@example.com";

    setupDbForSkippedEntry();
    vi.mocked(getCurrentRates).mockResolvedValue({});
    vi.mocked(promoteAffiliateTierIfEligible).mockResolvedValue({ promoted: false });
    vi.mocked(ensureRatesLocked).mockRejectedValue(
      new MissingCommissionRateError("standard", "monthly"),
    );

    const res = await request(createApp())
      .post("/api/admin/payouts/generate")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ periodMonth: PERIOD_MONTH });

    expect(res.status).toBe(200);
    expect(res.body.skippedEntries).toHaveLength(1);

    // Allow the fire-and-forget promise to settle
    await new Promise((r) => setTimeout(r, 10));

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.to).toBe("admin@example.com");
    expect(body.subject).toMatch(/skipped/i);
  });

  it("does not call fetch when RESEND_API_KEY is missing", async () => {
    process.env["ADMIN_EMAIL"] = "admin@example.com";
    // RESEND_API_KEY intentionally absent

    setupDbForSkippedEntry();
    vi.mocked(getCurrentRates).mockResolvedValue({});
    vi.mocked(promoteAffiliateTierIfEligible).mockResolvedValue({ promoted: false });
    vi.mocked(ensureRatesLocked).mockRejectedValue(
      new MissingCommissionRateError("standard", "monthly"),
    );

    await request(createApp())
      .post("/api/admin/payouts/generate")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ periodMonth: PERIOD_MONTH });

    await new Promise((r) => setTimeout(r, 10));
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("does not call fetch when there are no skipped entries", async () => {
    process.env["RESEND_API_KEY"] = "re_test_key";
    process.env["ADMIN_EMAIL"] = "admin@example.com";

    const rates = { standard: { monthly: 75 } };
    vi.mocked(getCurrentRates).mockResolvedValue(rates);
    vi.mocked(promoteAffiliateTierIfEligible).mockResolvedValue({ promoted: false });
    const lockedAffiliate = { ...affiliateRow, customMonthlyRateCents: 75 };
    vi.mocked(ensureRatesLocked).mockResolvedValue(lockedAffiliate);
    vi.mocked(resolveRateCents).mockReturnValue(75);

    const mdb = getDb();
    mdb.query.payoutBatchesTable.findFirst.mockResolvedValue(null);
    mdb.query.affiliatesTable.findFirst.mockResolvedValue(affiliateRow);
    mdb.select
      .mockReturnValueOnce(buildSelectChain([activeMonthlyConversion]))
      .mockReturnValueOnce(buildSelectChain([]))
      .mockReturnValue(buildSelectChain([]));
    mdb.insert
      .mockReturnValueOnce(buildInsertChain([]))
      .mockReturnValue(buildInsertChain([batchRow]));
    mdb.update.mockReturnValue(buildUpdateChain());

    await request(createApp())
      .post("/api/admin/payouts/generate")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ periodMonth: PERIOD_MONTH });

    await new Promise((r) => setTimeout(r, 10));
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/payouts/:id/approve — skipped-entry guard", () => {
  function setupApprovalDb(skippedCount: number, status = "draft") {
    const mdb = getDb();
    mdb.query.payoutBatchesTable.findFirst.mockResolvedValue({
      ...batchRow,
      skippedCount,
      status,
    });
    mdb.update.mockReturnValue(buildUpdateChain());
  }

  it("returns 409 batch_has_skipped_entries when skippedCount > 0 and force is not set", async () => {
    setupApprovalDb(2);

    const res = await request(createApp())
      .post("/api/admin/payouts/1/approve")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("batch_has_skipped_entries");
    expect(res.body.skippedCount).toBe(2);
  });

  it("allows approval when skippedCount > 0 and force: true is passed", async () => {
    setupApprovalDb(2);
    // returning() needs to resolve with an updated row
    const mdb = getDb();
    const approvedBatch = { ...batchRow, skippedCount: 2, status: "approved" };
    mdb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([approvedBatch]),
        }),
      }),
    });

    const res = await request(createApp())
      .post("/api/admin/payouts/1/approve")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({ force: true });

    expect(res.status).toBe(200);
  });

  it("allows approval without force when skippedCount is 0", async () => {
    setupApprovalDb(0);
    const mdb = getDb();
    const approvedBatch = { ...batchRow, skippedCount: 0, status: "approved" };
    mdb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([approvedBatch]),
        }),
      }),
    });

    const res = await request(createApp())
      .post("/api/admin/payouts/1/approve")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({});

    expect(res.status).toBe(200);
  });

  it("returns 409 batch_not_in_draft when batch is already approved", async () => {
    setupApprovalDb(0, "approved");

    const res = await request(createApp())
      .post("/api/admin/payouts/1/approve")
      .set("X-Admin-Key", ADMIN_KEY)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("batch_not_in_draft");
  });
});
