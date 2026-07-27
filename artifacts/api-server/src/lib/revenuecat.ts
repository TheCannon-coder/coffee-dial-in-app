import { logger } from "./logger";

const RC_API_BASE = "https://api.revenuecat.com/v2";

const RC_MONTHS_MS: Record<number, number> = {
  1:  30  * 24 * 60 * 60 * 1000,
  2:  60  * 24 * 60 * 60 * 1000,
  3:  90  * 24 * 60 * 60 * 1000,
  6:  180 * 24 * 60 * 60 * 1000,
  12: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Grant the "pro" entitlement to an RC customer via the v2 API.
 * months: 1, 2, 3, 6, or 12.
 * Returns true on success.
 */
export async function grantProEntitlement(rcId: string, months: number): Promise<boolean> {
  const secretKey = process.env["REVENUECAT_SECRET_KEY"];
  if (!secretKey) throw new Error("REVENUECAT_SECRET_KEY not set");

  const projectId = process.env["REVENUECAT_PROJECT_ID"];
  const entitlementId = process.env["REVENUECAT_PRO_ENTITLEMENT_ID"];
  if (!projectId || !entitlementId) {
    logger.error("grantProEntitlement: missing REVENUECAT_PROJECT_ID or REVENUECAT_PRO_ENTITLEMENT_ID");
    return false;
  }

  const durationMs = RC_MONTHS_MS[months] ?? RC_MONTHS_MS[1]!;
  const expiresAt = Date.now() + durationMs;

  try {
    const response = await fetch(
      `${RC_API_BASE}/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(rcId)}/actions/grant_entitlement`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entitlement_id: entitlementId, expires_at: expiresAt }),
      },
    );

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      logger.error({ rcId, months, status: response.status, error }, "grantProEntitlement: RC grant error");
      return false;
    }
    logger.info({ rcId, months, status: response.status, expiresAt }, "grantProEntitlement: granted");
    return true;
  } catch (err) {
    logger.error({ err, rcId, months }, "grantProEntitlement: unexpected error");
    return false;
  }
}
