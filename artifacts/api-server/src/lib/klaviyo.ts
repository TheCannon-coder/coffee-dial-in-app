/**
 * Klaviyo integration for waitlist signups.
 *
 * Uses the profile-subscription-bulk-create-jobs endpoint, which both
 * creates/updates the profile and subscribes it to a list with explicit
 * marketing consent in one call — the compliant way to add someone to a
 * marketing list from a signup form.
 *
 * Best-effort only: a Klaviyo failure never blocks or fails the waitlist
 * signup itself (the DB row is the source of truth). Requires
 * KLAVIYO_API_KEY + KLAVIYO_LIST_ID; no-ops with a warning log if unset,
 * per the standard feature-flag convention in this codebase.
 */

import { logger } from "./logger.js";

const KLAVIYO_REVISION = "2024-10-15";

export async function addToKlaviyoList(email: string, listId: string): Promise<void> {
  const apiKey = process.env["KLAVIYO_API_KEY"];
  if (!apiKey) {
    logger.warn({ listId }, "KLAVIYO_API_KEY not set — skipping Klaviyo list subscribe");
    return;
  }

  try {
    const response = await fetch("https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: KLAVIYO_REVISION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            profiles: {
              data: [
                {
                  type: "profile",
                  attributes: {
                    email,
                    subscriptions: {
                      email: {
                        marketing: {
                          consent: "SUBSCRIBED",
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
          relationships: {
            list: {
              data: {
                type: "list",
                id: listId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(
        { status: response.status, body: body.slice(0, 500) },
        "Klaviyo list subscribe failed",
      );
    }
  } catch (err) {
    logger.error({ err }, "Klaviyo list subscribe threw");
  }
}
