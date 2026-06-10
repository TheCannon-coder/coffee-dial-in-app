import { createHash } from "crypto";

const TTL_MS = 5 * 60 * 60 * 1000;

type CacheEntry = {
  items: unknown[];
  expiresAt: number;
  cachedAt: string;
};

const cache = new Map<string, CacheEntry>();

export function gearRecommendCacheKey(params: {
  method: string;
  missedDose: number;
  missedTemp: number;
  missedGrinder: number;
  experienceLevel: string;
}): string {
  const raw = [
    params.method,
    String(params.missedDose),
    String(params.missedTemp),
    String(params.missedGrinder),
    params.experienceLevel,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

export type CacheHit = { items: unknown[]; cachedAt: string };

export function getGearRecommendCache(key: string): CacheHit | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { items: entry.items, cachedAt: entry.cachedAt };
}

export function setGearRecommendCache(key: string, items: unknown[]): void {
  cache.set(key, { items, expiresAt: Date.now() + TTL_MS, cachedAt: new Date().toISOString() });
}

export function invalidateGearRecommendCache(): void {
  cache.clear();
}
