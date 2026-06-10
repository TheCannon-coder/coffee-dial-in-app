import { getItem, setItem } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GearItem = {
  id: string;
  emoji: string;
  /** Short label shown in the teaser chip */
  missingLabel: string;
  missCount: number;
  /** Coaching explanation of what this gap limits */
  limitingAdvice: string;
  /** How to solve it in plain language */
  solutionText: string;
  /** One product mention — just name and rough price */
  productName: string;
  productPrice: string;
  /** Goes through your affiliate redirect */
  affiliateUrl: string;
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  MISS_DOSE:    'gear_miss_dose',
  MISS_TEMP:    'gear_miss_temp',
  MISS_GRINDER: 'gear_miss_grinder',
  DISMISSED_AT: 'gear_dismissed_at',
  LAST_METHOD:  'gear_last_method',
  BREW_COUNT:   'gear_brew_count',
} as const;

/** Threshold: show after this many brews with the same field missing. */
const MISS_THRESHOLD = 3;

/** Don't re-show for this many days after the user dismisses. */
const DISMISS_DAYS = 30;

/** Base URL for the recommend API */
const API_BASE = 'https://www.coffeebrew.coach/api';

// ─── Detection helpers ────────────────────────────────────────────────────────

function isDoseMissing(dose?: string): boolean {
  if (!dose?.trim()) return true;
  return !/\d/.test(dose);
}

function isTempMissing(waterTemp?: string): boolean {
  return !waterTemp?.trim();
}

function isGrinderMissing(grinderNotes?: string): boolean {
  return !grinderNotes?.trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type BrewFields = {
  dose?: string;
  waterTemp?: string;
  grinderNotes?: string;
  method?: string;
};

/**
 * Called after every successful dial-in.
 * Increments miss counters for blank/imprecise fields; resets when the user logs them.
 * Stores the brew method so recommendations can be method-aware.
 */
export async function recordBrewFields(fields: BrewFields): Promise<void> {
  const [missedDose, missedTemp, missedGrinder, brewCount] = await Promise.all([
    getItem<number>(KEYS.MISS_DOSE),
    getItem<number>(KEYS.MISS_TEMP),
    getItem<number>(KEYS.MISS_GRINDER),
    getItem<number>(KEYS.BREW_COUNT),
  ]);

  await Promise.all([
    isDoseMissing(fields.dose)
      ? setItem(KEYS.MISS_DOSE, (missedDose ?? 0) + 1)
      : setItem(KEYS.MISS_DOSE, 0),
    isTempMissing(fields.waterTemp)
      ? setItem(KEYS.MISS_TEMP, (missedTemp ?? 0) + 1)
      : setItem(KEYS.MISS_TEMP, 0),
    isGrinderMissing(fields.grinderNotes)
      ? setItem(KEYS.MISS_GRINDER, (missedGrinder ?? 0) + 1)
      : setItem(KEYS.MISS_GRINDER, 0),
    setItem(KEYS.BREW_COUNT, (brewCount ?? 0) + 1),
    fields.method
      ? setItem(KEYS.LAST_METHOD, fields.method)
      : Promise.resolve(),
  ]);
}

export type GearRecommendResult = {
  items: GearItem[];
  cachedAt: string | null;
};

/**
 * Returns gear items for fields missing >= MISS_THRESHOLD times.
 * Calls the backend AI endpoint to get contextual, possibility-language product pitches.
 * Returns empty items if the user dismissed recently or has no qualifying gaps.
 * `cachedAt` is an ISO string when the server served a cached result, or null for a fresh AI call.
 */
export async function getActiveRecommendations(): Promise<GearRecommendResult> {
  const [missedDose, missedTemp, missedGrinder, dismissedAt, lastMethod, brewCount] =
    await Promise.all([
      getItem<number>(KEYS.MISS_DOSE),
      getItem<number>(KEYS.MISS_TEMP),
      getItem<number>(KEYS.MISS_GRINDER),
      getItem<string>(KEYS.DISMISSED_AT),
      getItem<string>(KEYS.LAST_METHOD),
      getItem<number>(KEYS.BREW_COUNT),
    ]);

  if (dismissedAt) {
    const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / 86_400_000;
    if (daysSince < DISMISS_DAYS) return { items: [], cachedAt: null };
  }

  const dose = missedDose ?? 0;
  const temp = missedTemp ?? 0;
  const grinder = missedGrinder ?? 0;

  if (dose < MISS_THRESHOLD && temp < MISS_THRESHOLD && grinder < MISS_THRESHOLD) {
    return { items: [], cachedAt: null };
  }

  try {
    const params = new URLSearchParams({
      method: lastMethod ?? 'general',
      missedDose: String(dose),
      missedTemp: String(temp),
      missedGrinder: String(grinder),
      brewCount: String(brewCount ?? 0),
    });

    const res = await fetch(`${API_BASE}/gear/recommend?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { items: [], cachedAt: null };

    const data = (await res.json()) as { items?: GearItem[]; cachedAt?: string | null };
    return { items: data.items ?? [], cachedAt: data.cachedAt ?? null };
  } catch {
    return { items: [], cachedAt: null };
  }
}

/** Call when the user dismisses the gear screen. */
export async function dismissGearRecommendations(): Promise<void> {
  await setItem(KEYS.DISMISSED_AT, new Date().toISOString());
}
