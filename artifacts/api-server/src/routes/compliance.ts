/**
 * Compliance routes — tax forms, FTC/GDPR disclosures, 1099/T4A/DAC7 exports.
 * Gated by REFERRAL_PROGRAM env var.
 *
 * Affiliate-facing:
 *   POST /api/affiliate/tax-form          W-9 (US) or W-8BEN (non-US), country-routed
 *   GET  /api/affiliate/tax-status        compliance readiness flags (no sensitive data)
 *   POST /api/affiliate/ftc-disclosure    accept FTC disclosure requirement
 *   POST /api/affiliate/gdpr-consent      EU/UK affiliates — GDPR data processing consent
 *
 * Admin-facing (X-Admin-Key):
 *   GET  /api/admin/tax/summary           all affiliates + full compliance status
 *   GET  /api/admin/tax/export-1099       year-end 1099-NEC CSV (US affiliates ≥ $600)
 *   GET  /api/admin/tax/export-t4a        year-end T4A CSV (CA affiliates ≥ CAD $500)
 *   GET  /api/admin/tax/export-dac7       year-end DAC7 report (EU affiliates)
 *   POST /api/admin/tax/reset-ytd         snapshot YTD → tax_records, then zero counters
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, gte, sql } from "drizzle-orm";
import { db, usersTable, affiliatesTable } from "@workspace/db";
import { taxRecordsTable } from "@workspace/db";
import { encryptField, decryptField } from "../lib/encryption";
import {
  getRequiredTaxForm,
  requiresGdprConsent,
  isAustralian,
  isCanadian,
  isEuMemberState,
  getWithholdingRatePct,
  usdCentsToEurCents,
  t4aThresholdUsdCents,
  isValidAbn,
  isValidSinOrBn,
} from "../lib/compliance-utils";
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

function requireAdmin(req: Request, res: Response): boolean {
  const key = req.headers["x-admin-key"];
  const expected = process.env["ADMIN_KEY"];
  if (!expected || key !== expected) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

// ── Tax form data types ────────────────────────────────────────────────────────

interface W9Data {
  legalName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  entityType: string; // individual | sole_proprietor | llc | corporation | partnership | other
  taxId: string;      // SSN (xxx-xx-xxxx) or EIN (xx-xxxxxxx) — ENCRYPTED
}

/** Base W-8BEN — all non-US affiliates */
interface W8BENData {
  name: string;
  country: string;
  foreignTaxId?: string; // home-country tax ID — ENCRYPTED
  /** AU only: Australian Business Number (11 digits). If absent → 47% withholding. */
  abn?: string;          // ENCRYPTED
  /** CA only: Social Insurance Number (9 digits) or CRA Business Number */
  sinOrBn?: string;      // ENCRYPTED
  /** Treaty info (optional) */
  treatyCountry?: string;
  treatyRate?: string;
}

// ── Affiliate lookup helper ────────────────────────────────────────────────────

async function findAffiliate(email: string) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  if (!user) return { user: null, affiliate: null };

  const affiliate = await db.query.affiliatesTable.findFirst({
    where: eq(affiliatesTable.userId, user.id),
  });
  return { user, affiliate };
}

// ── POST /api/affiliate/tax-form ──────────────────────────────────────────────
/**
 * Submit a tax form. The form type is determined by the affiliate's country:
 *   US → W-9 (IRS)
 *   AU → W-8BEN (+ ABN; missing ABN triggers 47% withholding)
 *   CA → W-8BEN (+ SIN or Business Number for T4A filing)
 *   EU/UK → W-8BEN (+ GDPR consent required before or alongside this call)
 *   All other non-US → W-8BEN (foreign person certification removes US WHT obligation)
 *
 * All tax IDs (SSN, EIN, ABN, SIN/BN, foreignTaxId) are stored AES-256-GCM
 * encrypted and are NEVER returned via any API response.
 */
router.post("/affiliate/tax-form", async (req: Request, res: Response) => {
  const {
    email,
    data,
    gdprConsent,
  } = req.body as {
    email?: string;
    data?: Record<string, unknown>;
    gdprConsent?: boolean;
  };

  if (!email || !data) {
    res.status(400).json({ error: "email and data are required" });
    return;
  }

  try {
    const { user, affiliate } = await findAffiliate(email);
    if (!user) { res.status(404).json({ error: "user_not_found" }); return; }
    if (!affiliate) { res.status(404).json({ error: "not_an_affiliate" }); return; }

    // Data minimization: Stripe Connect already collected W-9/W-8BEN, bank
    // details, and identity during onboarding. Accepting a duplicate manual
    // form would create a second encrypted copy of SSN/EIN/ABN with no legal
    // benefit and unnecessary exposure risk. Reject it here.
    if (affiliate.connectOnboardingComplete) {
      res.status(409).json({
        error: "tax_form_not_required",
        message:
          "Your tax information was collected by Stripe during Connect onboarding. " +
          "You do not need to submit a separate form. " +
          "FTC disclosure and GDPR consent (if applicable) are submitted independently.",
      });
      return;
    }

    const country = (affiliate.country ?? "US").toUpperCase();
    const formType = getRequiredTaxForm(country);

    // ── GDPR gate ──────────────────────────────────────────────────────────
    if (requiresGdprConsent(country)) {
      if (!gdprConsent && !affiliate.gdprConsent) {
        res.status(400).json({
          error: "gdpr_consent_required",
          message:
            "EU/UK affiliates must provide GDPR consent before submitting a tax form. " +
            "Pass gdprConsent: true in this request or call POST /api/affiliate/gdpr-consent first.",
        });
        return;
      }
    }

    // ── Form-type validation ───────────────────────────────────────────────
    let withholdTaxRatePct = 0;
    let withholdTax = false;

    if (formType === "w9") {
      const w9 = data as Partial<W9Data>;
      if (!w9.legalName || !w9.address || !w9.taxId) {
        res.status(400).json({ error: "w9 requires legalName, address, taxId" });
        return;
      }
    } else {
      // W-8BEN — shared base validation
      const w8 = data as Partial<W8BENData>;
      if (!w8.name) {
        res.status(400).json({ error: "w8ben requires name" });
        return;
      }

      // AU: ABN check → withholding determination
      if (isAustralian(country)) {
        const hasAbn = !!w8.abn && isValidAbn(String(w8.abn));
        if (w8.abn && !hasAbn) {
          res.status(400).json({
            error: "invalid_abn",
            message: "ABN must be 11 digits. Leave blank to proceed with 47% withholding.",
          });
          return;
        }
        withholdTaxRatePct = getWithholdingRatePct(country, hasAbn);
        withholdTax = withholdTaxRatePct > 0;
      }

      // CA: SIN or Business Number required
      if (isCanadian(country)) {
        if (!w8.sinOrBn) {
          res.status(400).json({
            error: "sin_or_bn_required",
            message: "Canadian affiliates must provide a SIN (9 digits) or CRA Business Number for T4A filing.",
          });
          return;
        }
        if (!isValidSinOrBn(String(w8.sinOrBn))) {
          res.status(400).json({
            error: "invalid_sin_or_bn",
            message: "SIN must be 9 digits (with or without dashes). Business Number format: 9 digits + program identifier (e.g. 123456789RT0001).",
          });
          return;
        }
      }
    }

    // ── Encrypt entire form data — no plaintext tax IDs ever stored ────────
    const taxFormDataEnc = encryptField(JSON.stringify(data));

    // ── Country-specific flags to update ──────────────────────────────────
    const now = new Date();
    const gdprConsentAt =
      requiresGdprConsent(country) && gdprConsent && !affiliate.gdprConsent
        ? now
        : undefined;
    const dac7Reportable = isEuMemberState(country);

    await db
      .update(affiliatesTable)
      .set({
        taxFormType: formType,
        taxFormDataEnc,
        taxFormComplete: true,
        withholdTax,
        withholdTaxRatePct,
        dac7Reportable,
        ...(gdprConsent && { gdprConsent: true }),
        ...(gdprConsentAt && { gdprConsentAt }),
      })
      .where(eq(affiliatesTable.id, affiliate.id));

    logger.info(
      { affiliateId: affiliate.id, formType, country, withholdTax, withholdTaxRatePct, dac7Reportable },
      "tax form submitted",
    );

    res.json({
      success: true,
      formType,
      country,
      withholdTax,
      withholdTaxRatePct,
      dac7Reportable,
      note: withholdTax
        ? `No ABN provided — ${withholdTaxRatePct}% withholding will be applied to all payouts until an ABN is submitted.`
        : undefined,
    });
  } catch (err) {
    logger.error({ err }, "affiliate/tax-form error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── GET /api/affiliate/tax-status ─────────────────────────────────────────────

router.get("/affiliate/tax-status", async (req: Request, res: Response) => {
  const email = req.query["email"] as string | undefined;
  if (!email) { res.status(400).json({ error: "email required" }); return; }

  try {
    const { user, affiliate } = await findAffiliate(email);
    if (!user) { res.status(404).json({ error: "user_not_found" }); return; }
    if (!affiliate) { res.status(404).json({ error: "not_an_affiliate" }); return; }

    const country = (affiliate.country ?? "US").toUpperCase();
    const requiredForm = getRequiredTaxForm(country);
    const needsGdpr = requiresGdprConsent(country);
    const needsAbn = isAustralian(country);
    const needsSinOrBn = isCanadian(country);

    // Tax compliance is satisfied by EITHER:
    //  - Stripe Connect onboarding complete (Stripe collected W-9/W-8BEN)
    //  - Our manual tax form (for Stage 1 PayPal affiliates)
    const taxOk = affiliate.connectOnboardingComplete || affiliate.taxFormComplete;
    const payoutReady =
      taxOk &&
      affiliate.ftcDisclosureAccepted &&
      (!needsGdpr || affiliate.gdprConsent);

    res.json({
      country,
      requiredForm,
      // Tax compliance path
      taxCompliant: taxOk,
      taxComplianceVia: affiliate.connectOnboardingComplete
        ? "stripe_connect"         // Stripe collected W-9/W-8BEN during onboarding
        : affiliate.taxFormComplete
          ? "manual_form"          // We collected it via our API (Stage 1)
          : "none",
      taxFormComplete: affiliate.taxFormComplete,
      taxFormType: affiliate.taxFormType,
      stripeConnectOnboarded: affiliate.connectOnboardingComplete,
      // FTC + GDPR — always our responsibility regardless of payment method
      ftcDisclosureAccepted: affiliate.ftcDisclosureAccepted,
      ftcAcceptedAt: affiliate.ftcAcceptedAt,
      needsGdprConsent: needsGdpr,
      gdprConsent: affiliate.gdprConsent,
      gdprConsentAt: affiliate.gdprConsentAt,
      // Withholding — our obligation even for Stripe Connect users
      withholdTax: affiliate.withholdTax,
      withholdTaxRatePct: affiliate.withholdTaxRatePct,
      dac7Reportable: affiliate.dac7Reportable,
      needsAbn,
      needsSinOrBn,
      payoutReady,
    });
  } catch (err) {
    logger.error({ err }, "affiliate/tax-status error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── POST /api/affiliate/ftc-disclosure ────────────────────────────────────────

router.post("/affiliate/ftc-disclosure", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "email required" }); return; }

  try {
    const { user, affiliate } = await findAffiliate(email);
    if (!user) { res.status(404).json({ error: "user_not_found" }); return; }
    if (!affiliate) { res.status(404).json({ error: "not_an_affiliate" }); return; }

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

// ── POST /api/affiliate/gdpr-consent ─────────────────────────────────────────
/**
 * Record GDPR consent for EU/UK affiliates.
 * The affiliate must actively confirm: "I consent to Dial In collecting and
 * processing my personal and tax data for the purpose of affiliate payments."
 *
 * This endpoint is a no-op for non-EU/UK affiliates (consent is not required
 * and storing it unnecessarily adds scope creep).
 */
router.post("/affiliate/gdpr-consent", async (req: Request, res: Response) => {
  const { email, consent } = req.body as { email?: string; consent?: boolean };
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  if (consent !== true) {
    res.status(400).json({
      error: "explicit_consent_required",
      message: "consent must be true — this action cannot be taken without explicit affirmative consent.",
    });
    return;
  }

  try {
    const { user, affiliate } = await findAffiliate(email);
    if (!user) { res.status(404).json({ error: "user_not_found" }); return; }
    if (!affiliate) { res.status(404).json({ error: "not_an_affiliate" }); return; }

    const country = (affiliate.country ?? "US").toUpperCase();
    if (!requiresGdprConsent(country)) {
      res.json({
        accepted: false,
        reason: "GDPR consent is only applicable for EU member state and UK affiliates.",
        country,
      });
      return;
    }

    const now = new Date();
    await db
      .update(affiliatesTable)
      .set({ gdprConsent: true, gdprConsentAt: now })
      .where(eq(affiliatesTable.id, affiliate.id));

    logger.info({ affiliateId: affiliate.id, country }, "GDPR consent recorded");
    res.json({
      accepted: true,
      acceptedAt: now.toISOString(),
      statement:
        "I consent to Dial In collecting and processing my personal and tax data for the purpose of affiliate payments.",
    });
  } catch (err) {
    logger.error({ err }, "affiliate/gdpr-consent error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── GET /api/admin/tax/summary ────────────────────────────────────────────────

router.get("/admin/tax/summary", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

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
        gdprConsent: affiliatesTable.gdprConsent,
        gdprConsentAt: affiliatesTable.gdprConsentAt,
        withholdTax: affiliatesTable.withholdTax,
        withholdTaxRatePct: affiliatesTable.withholdTaxRatePct,
        dac7Reportable: affiliatesTable.dac7Reportable,
        totalPaidYtdCents: affiliatesTable.totalPaidYtdCents,
        totalEarnedEurEquivCents: affiliatesTable.totalEarnedEurEquivCents,
        requires1099: affiliatesTable.requires1099,
        connectOnboardingComplete: affiliatesTable.connectOnboardingComplete,
      })
      .from(affiliatesTable)
      .orderBy(affiliatesTable.createdAt);

    const summary = affiliates.map((a) => {
      const country = (a.country ?? "US").toUpperCase();
      const needsGdpr = requiresGdprConsent(country);
      return {
        ...a,
        payoutReady:
          a.taxFormComplete &&
          a.ftcDisclosureAccepted &&
          (!needsGdpr || a.gdprConsent),
        totalPaidYtdDollars: (a.totalPaidYtdCents / 100).toFixed(2),
        totalEarnedEurEquivDollars: (a.totalEarnedEurEquivCents / 100).toFixed(2),
        dac7ThresholdCrossed: a.totalEarnedEurEquivCents >= 200_000, // EUR €2,000
        t4aApplicable: isCanadian(country),
        gdprRequired: needsGdpr,
      };
    });

    res.json(summary);
  } catch (err) {
    logger.error({ err }, "admin/tax/summary error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── GET /api/admin/tax/export-1099 ────────────────────────────────────────────
/**
 * 1099-NEC CSV for all US affiliates who received ≥ $600 in the specified year.
 * Decrypts W-9 data server-side only. NEVER exposed via any other endpoint.
 */
router.get("/admin/tax/export-1099", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const year = Number(req.query["year"] ?? new Date().getFullYear());
  if (isNaN(year) || year < 2020 || year > 2100) {
    res.status(400).json({ error: "valid year required" });
    return;
  }

  try {
    const records = await db
      .select({
        affiliateId: taxRecordsTable.affiliateId,
        totalPaidCents: taxRecordsTable.totalPaidCents,
        requires1099: taxRecordsTable.requires1099,
      })
      .from(taxRecordsTable)
      .where(and(eq(taxRecordsTable.year, year), eq(taxRecordsTable.requires1099, true)));

    if (records.length === 0) {
      res.json({ message: "No 1099-eligible US affiliates found for this year", year });
      return;
    }

    const affiliateIds = records.map((r) => r.affiliateId);
    const affiliates = await db
      .select({
        id: affiliatesTable.id,
        country: affiliatesTable.country,
        taxFormDataEnc: affiliatesTable.taxFormDataEnc,
        taxFormComplete: affiliatesTable.taxFormComplete,
      })
      .from(affiliatesTable)
      .where(sql`${affiliatesTable.id} = ANY(${sql.raw(`ARRAY[${affiliateIds.join(",")}]::int[]`)})`);

    const affMap = new Map(affiliates.map((a) => [a.id, a]));

    const rows = ["affiliateId,year,legalName,address,city,state,zip,entityType,taxId,totalCompensationUSD"];

    for (const r of records) {
      const aff = affMap.get(r.affiliateId);
      if (!aff?.taxFormComplete || !aff.taxFormDataEnc) continue;
      if ((aff.country ?? "US").toUpperCase() !== "US") continue; // 1099 is US-only

      let w9: Partial<W9Data> = {};
      try {
        w9 = JSON.parse(decryptField(aff.taxFormDataEnc)) as Partial<W9Data>;
      } catch {
        logger.error({ affiliateId: aff.id }, "failed to decrypt W-9 for 1099 export");
        continue;
      }

      rows.push([
        r.affiliateId, year,
        `"${(w9.legalName ?? "").replace(/"/g, '""')}"`,
        `"${(w9.address ?? "").replace(/"/g, '""')}"`,
        `"${(w9.city ?? "").replace(/"/g, '""')}"`,
        w9.state ?? "", w9.zip ?? "", w9.entityType ?? "",
        w9.taxId ?? "",
        (r.totalPaidCents / 100).toFixed(2),
      ].join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="1099-nec-${year}.csv"`);
    res.send(rows.join("\n"));
  } catch (err) {
    logger.error({ err }, "admin/tax/export-1099 error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── GET /api/admin/tax/export-t4a ────────────────────────────────────────────
/**
 * T4A slip CSV for Canadian affiliates who received ≥ CAD $500 in the year.
 * Uses approximate USD→CAD conversion (CAD_USD_RATE env var, default 0.74).
 * Decrypts W-8BEN data to extract SIN/BN server-side only.
 *
 * T4A Box 48 = Fees for services. File with CRA by the last day of February.
 */
router.get("/admin/tax/export-t4a", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const year = Number(req.query["year"] ?? new Date().getFullYear());
  if (isNaN(year) || year < 2020 || year > 2100) {
    res.status(400).json({ error: "valid year required" });
    return;
  }

  try {
    const thresholdUsdCents = t4aThresholdUsdCents();

    const records = await db
      .select({
        affiliateId: taxRecordsTable.affiliateId,
        totalPaidCents: taxRecordsTable.totalPaidCents,
      })
      .from(taxRecordsTable)
      .where(
        and(
          eq(taxRecordsTable.year, year),
          gte(taxRecordsTable.totalPaidCents, thresholdUsdCents),
        ),
      );

    // Filter to Canadian affiliates only
    const affiliateIds = records.map((r) => r.affiliateId);
    if (affiliateIds.length === 0) {
      res.json({ message: "No T4A-eligible Canadian affiliates found for this year", year });
      return;
    }

    const affiliates = await db
      .select({
        id: affiliatesTable.id,
        country: affiliatesTable.country,
        taxFormDataEnc: affiliatesTable.taxFormDataEnc,
        taxFormComplete: affiliatesTable.taxFormComplete,
      })
      .from(affiliatesTable)
      .where(sql`${affiliatesTable.id} = ANY(${sql.raw(`ARRAY[${affiliateIds.join(",")}]::int[]`)})`);

    const affMap = new Map(affiliates.map((a) => [a.id, a]));
    const cadUsdRate = parseFloat(process.env["CAD_USD_RATE"] ?? "0.74");

    const rows = [
      "affiliateId,year,name,sinOrBn,totalPaidUSD,estimatedTotalCAD,box48FeesForServices",
    ];

    for (const r of records) {
      const aff = affMap.get(r.affiliateId);
      if (!aff) continue;
      if ((aff.country ?? "").toUpperCase() !== "CA") continue;
      if (!aff.taxFormComplete || !aff.taxFormDataEnc) continue;

      let w8: Partial<W8BENData> = {};
      try {
        w8 = JSON.parse(decryptField(aff.taxFormDataEnc)) as Partial<W8BENData>;
      } catch {
        logger.error({ affiliateId: aff.id }, "failed to decrypt W-8BEN for T4A export");
        continue;
      }

      const totalUsd = (r.totalPaidCents / 100).toFixed(2);
      const totalCad = (r.totalPaidCents / cadUsdRate / 100).toFixed(2);

      rows.push([
        r.affiliateId, year,
        `"${(w8.name ?? "").replace(/"/g, '""')}"`,
        w8.sinOrBn ?? "",
        totalUsd, totalCad, totalCad, // Box 48 = same as total
      ].join(","));
    }

    if (rows.length === 1) {
      res.json({ message: "No T4A-eligible Canadian affiliates with complete tax forms", year });
      return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="t4a-${year}.csv"`);
    res.send(rows.join("\n"));
  } catch (err) {
    logger.error({ err }, "admin/tax/export-t4a error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── GET /api/admin/tax/export-dac7 ───────────────────────────────────────────
/**
 * DAC7 report for EU member state affiliates.
 * Lists all EU affiliates with their EUR-equivalent earnings for the year.
 * DAC7 threshold: EUR €2,000 gross proceeds per seller per year.
 *
 * File with your EU member state tax authority by January 31 of the following year.
 * Note: amounts are USD-to-EUR conversions; verify rates at filing time.
 */
router.get("/admin/tax/export-dac7", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const year = Number(req.query["year"] ?? new Date().getFullYear());
  if (isNaN(year) || year < 2020 || year > 2100) {
    res.status(400).json({ error: "valid year required" });
    return;
  }

  try {
    const records = await db
      .select({
        affiliateId: taxRecordsTable.affiliateId,
        totalPaidCents: taxRecordsTable.totalPaidCents,
      })
      .from(taxRecordsTable)
      .where(eq(taxRecordsTable.year, year));

    if (records.length === 0) {
      res.json({ message: "No DAC7 records for this year", year });
      return;
    }

    const affiliateIds = records.map((r) => r.affiliateId);
    const affiliates = await db
      .select({
        id: affiliatesTable.id,
        country: affiliatesTable.country,
        dac7Reportable: affiliatesTable.dac7Reportable,
        totalEarnedEurEquivCents: affiliatesTable.totalEarnedEurEquivCents,
        taxFormDataEnc: affiliatesTable.taxFormDataEnc,
        taxFormComplete: affiliatesTable.taxFormComplete,
      })
      .from(affiliatesTable)
      .where(sql`${affiliatesTable.id} = ANY(${sql.raw(`ARRAY[${affiliateIds.join(",")}]::int[]`)})`);

    const affMap = new Map(affiliates.map((a) => [a.id, a]));
    const DAC7_THRESHOLD_EUR_CENTS = 200_000; // EUR €2,000

    const rows = [
      "affiliateId,year,country,name,totalPaidUSD,totalEarnedEUR,aboveDAC7Threshold,foreignTaxId",
    ];

    for (const r of records) {
      const aff = affMap.get(r.affiliateId);
      if (!aff?.dac7Reportable) continue; // EU member states only

      let name = "";
      let foreignTaxId = "";
      if (aff.taxFormComplete && aff.taxFormDataEnc) {
        try {
          const w8 = JSON.parse(decryptField(aff.taxFormDataEnc)) as Partial<W8BENData>;
          name = w8.name ?? "";
          foreignTaxId = w8.foreignTaxId ?? "";
        } catch {
          logger.error({ affiliateId: aff.id }, "failed to decrypt W-8BEN for DAC7 export");
        }
      }

      const totalUsd = (r.totalPaidCents / 100).toFixed(2);
      const totalEur = (aff.totalEarnedEurEquivCents / 100).toFixed(2);
      const aboveThreshold = aff.totalEarnedEurEquivCents >= DAC7_THRESHOLD_EUR_CENTS;

      rows.push([
        r.affiliateId, year,
        aff.country ?? "",
        `"${name.replace(/"/g, '""')}"`,
        totalUsd, totalEur,
        aboveThreshold ? "YES" : "NO",
        foreignTaxId,
      ].join(","));
    }

    if (rows.length === 1) {
      res.json({ message: "No DAC7-reportable EU affiliates found for this year", year });
      return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="dac7-${year}.csv"`);
    res.send(rows.join("\n"));
  } catch (err) {
    logger.error({ err }, "admin/tax/export-dac7 error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── POST /api/admin/tax/reset-ytd ────────────────────────────────────────────
/**
 * Run on January 1 each year.
 * 1. Snapshots every affiliate's YTD figures into tax_records for the given year.
 * 2. Zeros totalPaidYtdCents, requires1099, and totalEarnedEurEquivCents for the new year.
 */
router.post("/admin/tax/reset-ytd", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { year } = req.body as { year?: number };
  if (!year || year < 2020 || year > 2100) {
    res.status(400).json({ error: "year required (e.g. 2026 for the year just ended)" });
    return;
  }

  try {
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

    await db
      .update(affiliatesTable)
      .set({
        totalPaidYtdCents: 0,
        requires1099: false,
        totalEarnedEurEquivCents: 0,
      })
      .where(gte(affiliatesTable.totalPaidYtdCents, 0));

    logger.info({ year, snapshotCount: eligible.length }, "YTD reset completed");
    res.json({ success: true, year, snapshotCount: eligible.length });
  } catch (err) {
    logger.error({ err }, "admin/tax/reset-ytd error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
