/**
 * Auth for the affiliate web dashboard.
 *
 * No app-wide session system exists (mirrors the pattern in routes/admin.ts:
 * localized auth, not global middleware). Affiliates never set a password —
 * every affiliate already has a `payoutEmail` on file from signup, so login
 * is a single-use magic link:
 *
 *   1. Affiliate submits their payoutEmail on /affiliate/login.
 *   2. If it matches an active affiliate, a random token is generated,
 *      its SHA-256 hash stored (short expiry, single-use), and the raw
 *      token emailed as a link via Resend.
 *   3. Clicking the link redeems the token and sets an httpOnly,
 *      HMAC-signed session cookie (same "signed cookie value" idea as
 *      admin.ts's admin_tok, but carrying an affiliate id + expiry).
 *
 * "Confirmed affiliate" = a row in `affiliates` with isActive = true.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { eq, and, gt, isNull } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, affiliatesTable, affiliateLoginTokensTable, type Affiliate } from "@workspace/db";

const SESSION_COOKIE = "affiliate_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getSessionSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured — cannot sign affiliate sessions");
  }
  return secret;
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// ── Magic-link login tokens ──────────────────────────────────────────────────

/** Creates a single-use login token for an affiliate. Returns the raw token to email. */
export async function createLoginToken(affiliateId: number): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  await db.insert(affiliateLoginTokensTable).values({
    affiliateId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
  });
  return rawToken;
}

/** Redeems a login token. Returns the affiliate if valid, unexpired, and unused; marks it used. */
export async function redeemLoginToken(rawToken: string): Promise<Affiliate | null> {
  const tokenHash = hashToken(rawToken);
  const row = await db.query.affiliateLoginTokensTable.findFirst({
    where: and(
      eq(affiliateLoginTokensTable.tokenHash, tokenHash),
      isNull(affiliateLoginTokensTable.usedAt),
      gt(affiliateLoginTokensTable.expiresAt, new Date()),
    ),
  });
  if (!row) return null;

  await db
    .update(affiliateLoginTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(affiliateLoginTokensTable.id, row.id));

  const affiliate = await db.query.affiliatesTable.findFirst({
    where: and(eq(affiliatesTable.id, row.affiliateId), eq(affiliatesTable.isActive, true)),
  });
  return affiliate ?? null;
}

// ── Session cookie ───────────────────────────────────────────────────────────

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

/** Builds a signed `affiliateId.expiry.signature` cookie value. */
export function buildSessionCookieValue(affiliateId: number): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${affiliateId}.${expires}`;
  return `${payload}.${signPayload(payload)}`;
}

/** Verifies a session cookie value and returns the affiliateId if valid. */
function verifySessionCookieValue(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [idStr, expiresStr, sig] = parts as [string, string, string];
  const payload = `${idStr}.${expiresStr}`;
  const expected = signPayload(payload);

  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  const affiliateId = Number(idStr);
  return Number.isFinite(affiliateId) ? affiliateId : null;
}

export function setAffiliateSessionCookie(res: Response, affiliateId: number): void {
  res.cookie(SESSION_COOKIE, buildSessionCookieValue(affiliateId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearAffiliateSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

// ── Express augmentation + middleware ────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      affiliate?: Affiliate;
    }
  }
}

/**
 * Loads the confirmed affiliate for the session cookie onto req.affiliate.
 * If there's no valid session for an active affiliate, redirects HTML
 * requests to /affiliate/login and 401s API requests.
 */
export async function requireAffiliateAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const cookies = parseCookies(req.headers["cookie"]);
  const raw = cookies[SESSION_COOKIE];
  const affiliateId = raw ? verifySessionCookieValue(raw) : null;

  const affiliate = affiliateId
    ? await db.query.affiliatesTable.findFirst({
        where: and(eq(affiliatesTable.id, affiliateId), eq(affiliatesTable.isActive, true)),
      })
    : null;

  if (!affiliate) {
    clearAffiliateSessionCookie(res);
    const acceptsHtml = req.headers["accept"]?.includes("text/html");
    if (acceptsHtml) {
      res.redirect(302, "/affiliate/login");
    } else {
      res.status(401).json({ error: "not_authenticated" });
    }
    return;
  }

  req.affiliate = affiliate;
  next();
}
