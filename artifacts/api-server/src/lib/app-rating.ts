import { logger } from "./logger.js";

/**
 * Live App Store rating via Apple's public iTunes Lookup API, cached in
 * memory. Pages read the cache synchronously; a stale cache triggers one
 * background refresh (stale-while-revalidate) so requests never wait on
 * Apple. Ratings are per-storefront, so we combine the storefronts we sell
 * in as a count-weighted average.
 */

const APP_ID = "6777418888";
const STOREFRONTS = ["us", "ca"];
const TTL_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 60 * 1000; // after a failed refresh, try again in an hour

export interface AppRating {
  rating: number; // e.g. 5.0, one decimal
  count: number;
}

let cached: AppRating | null = null;
let checkedAt = 0;
let inflight: Promise<void> | null = null;

async function fetchStorefront(country: string): Promise<AppRating | null> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${APP_ID}&country=${country}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`itunes lookup ${country}: HTTP ${res.status}`);
  const data = (await res.json()) as {
    results?: Array<{ averageUserRating?: number; userRatingCount?: number }>;
  };
  const app = data.results?.[0];
  if (!app) return null;
  return { rating: app.averageUserRating ?? 0, count: app.userRatingCount ?? 0 };
}

async function refresh(): Promise<void> {
  const results = await Promise.allSettled(STOREFRONTS.map(fetchStorefront));
  let count = 0;
  let weighted = 0;
  let anySucceeded = false;
  for (const r of results) {
    if (r.status !== "fulfilled") {
      logger.warn({ err: r.reason }, "app rating storefront lookup failed");
      continue;
    }
    anySucceeded = true;
    if (r.value && r.value.count > 0) {
      count += r.value.count;
      weighted += r.value.rating * r.value.count;
    }
  }
  if (anySucceeded) {
    cached = count > 0 ? { rating: Math.round((weighted / count) * 10) / 10, count } : null;
    checkedAt = Date.now();
    logger.info({ rating: cached?.rating, count: cached?.count }, "app rating refreshed");
  } else {
    // Total failure: keep serving the last known value, retry sooner than TTL.
    checkedAt = Date.now() - TTL_MS + RETRY_MS;
  }
}

/** Last known rating (null until first successful fetch, or while unrated). */
export function getAppRating(): AppRating | null {
  if (Date.now() - checkedAt > TTL_MS && !inflight) {
    inflight = refresh()
      .catch(err => logger.warn({ err }, "app rating refresh failed"))
      .finally(() => {
        inflight = null;
      });
  }
  return cached;
}

/** Kick off the first fetch at boot so early page views already have data. */
export function prefetchAppRating(): void {
  getAppRating();
}
