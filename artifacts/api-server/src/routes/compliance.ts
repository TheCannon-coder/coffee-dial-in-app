/**
 * Compliance routes — tax forms, FTC disclosure, 1099 export.
 * Gated by REFERRAL_PROGRAM env var.
 *
 * Affiliate-facing (auth: email in body):
 *   POST /api/affiliate/tax-form          submit W-9 or W-8BEN (encrypted at rest)
 *   GET  /api/affiliate/tax-status        check compliance readiness
 *   POST /api/affiliate/ftc-disclosure    accept FTC disclosure requirement
 *
 * Admin-facing (auth: X-Admin-Key header):
 *   GET  /api/admin/tax/summary           all affiliates + compliance status
 *   GET  /api/admin/tax/export-1099       year-end 1099-NEC CSV (decrypts tax IDs)
 *   POST /api/admin/tax/reset-ytd         snapshot YTD into tax_records then zero it
 */

import { Router } from "express";
import { eq, and, gte, sql } from "drizzle-orm";
import { db, usersTable, affiliatesTable } from "@workspace/db";
import { taxRecordsTable } from "@workspace/db";
import { encryptField, decryptField } from "../lib/encryption";
import { logger } from "../lib/logger";

const router = Router();

// ── Feature gate ───────────────────────────────────────────────────────────────

router.use((_req, res, next) => {
  if (!process.env["REFERRAL_PROGRAM"]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  next();
});

// ── Admin auth helper ──────────────────────────────────────────────────────────

function requireAdmin(
  req: Parameters<Router>[0],
  res: Parameters<Router>[1],
): boolean {
  const key = (req as import("express").Request).headers["x-admin-key"];
  const expected = process.env["ADMIN_KEY"];
  if (!expected || key !== expected) {
    (res as import("express").Response).status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

// ── W-9 / W-8BEN field definitions ────────────────────────────────────────────

interface W9Data {
  legalName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  entityType: string; // individual | sole_proprietor | llc | corporation | partnership | other
  taxId: string; // SSN (xxx-xx-xxxx) or EIN (xx-xxxxxxx) — ENCRYPTED
}

interface W8BENData {
  name: string;
  country: string;
  foreignTaxId: string; // ENCRYPTED
  treatyCountry?: string;
}

// ── Affiliate-facing routes ───────────────────────────────────────────────────

/**
 * POST /api/affiliate/tax-form
 * Body: { email, formType: "w9"|"w8ben", data: W9Data|W8BENData }
 *
 * Encrypts the full data blob with AES-256-GCM and stores it.
 * Tax IDs (SSN, EIN, foreignTaxId) are never returned in any API response.
 */
router.post("/affiliate/tax-form", async (req, res) => {
  const { email, formType, data } = req.body as {
    email?: string;
    formType?: string;
    data?: Record<string, unknown>;
  };

  if (!email || !formType || !data) {
    res.status(400).json({ error: "email, formType, and data are required" });
    return;
  }
  if (!["w9", "w8ben"].includes(formType)) {
    res.status(400).json({ error: "formType must be w9 or w8ben" });
    return;
  }

  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, user.id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_an_affiliate" });
      return;
    }

    // Validate required fields per form type
    if (formType === "w9") {
      const w9 = data as Partial<W9Data>;
      if (!w9.legalName || !w9.address || !w9.taxId) {
        res.status(400).json({ error: "w9 requires legalName, address, taxId" });
        return;
      }
    } else {
      const w8 = data as Partial<W8BENData>;
      if (!w8.name || !w8.country || !w8.foreignTaxId) {
        res.status(400).json({ error: "w8ben requires name, country, foreignTaxId" });
        return;
      }
    }

    // Encrypt the entire data blob — tax IDs never stored plain
    const taxFormDataEnc = encryptField(JSON.stringify(data));

    await db
      .update(affiliatesTable)
      .set({
        taxFormType: formType,
        taxFormDataEnc,
        taxFormComplete: true,
      })
      .where(eq(affiliatesTable.id, affiliate.id));

    logger.info({ affiliateId: affiliate.id, formType }, "tax form submitted");
    res.json({ success: true, formType });
  } catch (err) {
    logger.error({ err }, "affiliate/tax-form error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/affiliate/tax-status?email=...
 *
 * Returns compliance readiness without any sensitive data.
 */
router.get("/affiliate/tax-status", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, user.id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_an_affiliate" });
      return;
    }

    const payoutReady = affiliate.taxFormComplete && affiliate.ftcDisclosureAccepted;

    res.json({
      taxFormComplete: affiliate.taxFormComplete,
      taxFormType: affiliate.taxFormType,
      ftcDisclosureAccepted: affiliate.ftcDisclosureAccepted,
      ftcAcceptedAt: affiliate.ftcAcceptedAt,
      payoutReady,
    });
  } catch (err) {
    logger.error({ err }, "affiliate/tax-status error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/affiliate/ftc-disclosure
 * Body: { email }
 *
 * Records that the affiliate has accepted the FTC disclosure requirement.
 * Timestamp is stored; this cannot be un-accepted.
 */
router.post("/affiliate/ftc-disclosure", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, user.id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_an_affiliate" });
      return;
    }

    const now = new Date();
    await db
      .update(affiliatesTable)
      .set({ ftcDisclosureAccepted: true, ftcAcceptedAt: now })
      .where(eq(affiliatesTable.id, affiliate.id));

    logger.info({ affiliateId: affiliate.id }, "FTC disclosure accepted");
    res.json({ accepted: true, acceptedAt: now.toISOString() });
  } catch (err) {
    logger.error({ err }, "affiliate/ftc-disclosure error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/tax/summary
 *
 * Lists all affiliates with their compliance status.
 * Does NOT return any tax data — only boolean flags.
 */
router.get("/admin/tax/summary", async (req, res) => {
  if (!requireAdmin(req as import("express").Request, res as import("express").Response)) return;

  try {
    const affiliates = await db
      .select({
        id: affiliatesTable.id,
        userId: affiliatesTable.userId,
        payoutEmail: affiliatesTable.payoutEmail,
        country: affiliatesTable.country,
        tier: affiliatesTable.tier,
        taxFormType: affiliatesTable.taxFormType,
        taxFormComplete: affiliatesTable.taxFormComplete,
        ftcDisclosureAccepted: affiliatesTable.ftcDisclosureAccepted,
        ftcAcceptedAt: affiliatesTable.ftcAcceptedAt,
        totalPaidYtdCents: affiliatesTable.totalPaidYtdCents,
        requires1099: affiliatesTable.requires1099,
        connectOnboardingComplete: affiliatesTable.connectOnboardingComplete,
      })
      .from(affiliatesTable)
      .orderBy(affiliatesTable.createdAt);

    const summary = affiliates.map((a) => ({
      ...a,
      payoutReady: a.taxFormComplete && a.ftcDisclosureAccepted,
      totalPaidYtdDollars: (a.totalPaidYtdCents / 100).toFixed(2),
    }));

    res.json(summary);
  } catch (err) {
    logger.error({ err }, "admin/tax/summary error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/admin/tax/export-1099?year=2026
 *
 * Generates a 1099-NEC CSV for all US affiliates who received >= $600 in the
 * specified year. Decrypts tax IDs server-side for the CSV — never exposed
 * via any other endpoint.
 *
 * CSV columns: affiliateId, legalName, address, city, state, zip, entityType,
 *              taxId (SSN/EIN), totalCompensation, year
 */
router.get("/admin/tax/export-1099", async (req, res) => {
  if (!requireAdmin(req as import("express").Request, res as import("express").Response)) return;

  const year = Number(req.query["year"] ?? new Date().getFullYear());
  if (isNaN(year) || year < 2020 || year > 2100) {
    res.status(400).json({ error: "valid year required" });
    return;
  }

  try {
    // Pull from tax_records if they exist, otherwise fall back to current YTD
    const records = await db
      .select({
        affiliateId: taxRecordsTable.affiliateId,
        totalPaidCents: taxRecordsTable.totalPaidCents,
        requires1099: taxRecordsTable.requires1099,
      })
      .from(taxRecordsTable)
      .where(
        and(
          eq(taxRecordsTable.year, year),
          eq(taxRecordsTable.requires1099, true),
        ),
      );

    if (records.length === 0) {
      res.json({ message: "No 1099-eligible affiliates found for this year", year });
      return;
    }

    const affiliateIds = records.map((r) => r.affiliateId);
    const affiliates = await db
      .select({
        id: affiliatesTable.id,
        country: affiliatesTable.country,
        taxFormType: affiliatesTable.taxFormType,
        taxFormDataEnc: affiliatesTable.taxFormDataEnc,
        taxFormComplete: affiliatesTable.taxFormComplete,
      })
      .from(affiliatesTable)
      .where(
        sql`${affiliatesTable.id} = ANY(${sql.raw(`ARRAY[${affiliateIds.join(",")}]::int[]`)})`,
      );

    const affiliateMap = new Map(affiliates.map((a) => [a.id, a]));

    const csvRows: string[] = [
      "affiliateId,year,legalName,address,city,state,zip,entityType,taxId,totalCompensationUSD",
    ];

    for (const record of records) {
      const aff = affiliateMap.get(record.affiliateId);
      if (!aff || aff.country !== "US" || !aff.taxFormComplete || !aff.taxFormDataEnc) {
        continue;
      }

      let w9: Partial<W9Data> = {};
      try {
        w9 = JSON.parse(decryptField(aff.taxFormDataEnc)) as Partial<W9Data>;
      } catch {
        logger.error({ affiliateId: aff.id }, "failed to decrypt tax form for 1099 export");
        continue;
      }

      const total = (record.totalPaidCents / 100).toFixed(2);
      const row = [
        record.affiliateId,
        year,
        `"${(w9.legalName ?? "").replace(/"/g, '""')}"`,
        `"${(w9.address ?? "").replace(/"/g, '""')}"`,
        `"${(w9.city ?? "").replace(/"/g, '""')}"`,
        w9.state ?? "",
        w9.zip ?? "",
        w9.entityType ?? "",
        w9.taxId ?? "",
        total,
      ].join(",");
      csvRows.push(row);
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="1099-nec-${year}.csv"`,
    );
    res.send(csvRows.join("\n"));
  } catch (err) {
    logger.error({ err }, "admin/tax/export-1099 error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/admin/tax/reset-ytd
 * Body: { year: number } — the year that just ended
 *
 * 1. Snapshots every affiliate's current total_paid_ytd_cents into tax_records
 *    for the specified year (upsert — safe to run multiple times).
 * 2. Zeros out total_paid_ytd_cents and requires_1099 for the new year.
 *
 * Run this on January 1.
 */
router.post("/admin/tax/reset-ytd", async (req, res) => {
  if (!requireAdmin(req as import("express").Request, res as import("express").Response)) return;

  const { year } = req.body as { year?: number };
  if (!year || year < 2020 || year > 2100) {
    res.status(400).json({ error: "year required (e.g. 2026 for the year just ended)" });
    return;
  }

  try {
    // Snapshot current YTD into tax_records (only for those with any earnings)
    const eligible = await db
      .select({
        id: affiliatesTable.id,
        totalPaidYtdCents: affiliatesTable.totalPaidYtdCents,
        requires1099: affiliatesTable.requires1099,
      })
      .from(affiliatesTable)
      .where(gte(affiliatesTable.totalPaidYtdCents, 1));

    if (eligible.length > 0) {
      await db
        .insert(taxRecordsTable)
        .values(
          eligible.map((a) => ({
            affiliateId: a.id,
            year,
            totalPaidCents: a.totalPaidYtdCents,
            requires1099: a.requires1099,
          })),
        )
        .onConflictDoUpdate({
          target: [taxRecordsTable.affiliateId, taxRecordsTable.year],
          set: {
            totalPaidCents: sql`EXCLUDED.total_paid_cents`,
            requires1099: sql`EXCLUDED.requires_1099`,
          },
        });
    }

    // Zero out YTD for the new year
    await db
      .update(affiliatesTable)
      .set({ totalPaidYtdCents: 0, requires1099: false })
      .where(gte(affiliatesTable.totalPaidYtdCents, 0));

    logger.info({ year, snapshotCount: eligible.length }, "YTD reset completed");
    res.json({ success: true, year, snapshotCount: eligible.length });
  } catch (err) {
    logger.error({ err }, "admin/tax/reset-ytd error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
