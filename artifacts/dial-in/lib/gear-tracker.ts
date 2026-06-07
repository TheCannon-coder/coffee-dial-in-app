import { getItem, setItem } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GearItem = {
  id: 'scale' | 'kettle' | 'grinder';
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
  /** Goes through your affiliate redirect; update the Vercel endpoint to set the real URL */
  affiliateUrl: string;
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  MISS_DOSE:    'gear_miss_dose',
  MISS_TEMP:    'gear_miss_temp',
  MISS_GRINDER: 'gear_miss_grinder',
  DISMISSED_AT: 'gear_dismissed_at',
} as const;

/** Threshold: show after this many brews with the same field missing. */
const MISS_THRESHOLD = 3;

/** Don't re-show for this many days after the user dismisses. */
const DISMISS_DAYS = 30;

// ─── Gear catalogue ───────────────────────────────────────────────────────────

function buildGearItem(id: GearItem['id'], missCount: number): GearItem {
  switch (id) {
    case 'scale':
      return {
        id,
        emoji: '⚖️',
        missingLabel: 'dose in grams',
        missCount,
        limitingAdvice:
          `You haven't logged your dose in grams across ${missCount} recent brew${missCount !== 1 ? 's' : ''}. ` +
          `Without a consistent weight, your coffee-to-water ratio drifts every time — ` +
          `so our advice can only go so far. Once you're weighing your dose, we can tell you exactly what to change.`,
        solutionText:
          `Any digital kitchen scale works. If you want something made for the countertop, ` +
          `the Timemore Black Mirror is what most home baristas use — it's accurate to 0.1g and has a built-in timer.`,
        productName: 'Timemore Black Mirror',
        productPrice: '~$75',
        affiliateUrl: 'https://www.coffeebrew.coach/api/gear/timemore-black-mirror',
      };

    case 'kettle':
      return {
        id,
        emoji: '🌡️',
        missingLabel: 'water temperature',
        missCount,
        limitingAdvice:
          `You've skipped water temperature ${missCount} time${missCount !== 1 ? 's' : ''}. ` +
          `Temperature is one of the biggest extraction variables — a few degrees separates sour from sweet. ` +
          `Without it, we're guessing half the picture when we give you advice.`,
        solutionText:
          `A temperature-controlled kettle lets you set the exact degree and hold it. ` +
          `The Fellow Stagg EKG is the one most specialty baristas use at home — it's precise, looks good on a counter, and has a gooseneck for better pour control.`,
        productName: 'Fellow Stagg EKG',
        productPrice: '~$165',
        affiliateUrl: 'https://www.coffeebrew.coach/api/gear/fellow-stagg-ekg',
      };

    case 'grinder':
      return {
        id,
        emoji: '⚙️',
        missingLabel: 'grinder setting',
        missCount,
        limitingAdvice:
          `You haven't logged a grinder setting in ${missCount} brew${missCount !== 1 ? 's' : ''}. ` +
          `When we say "grind finer", that only works if you have a grinder with numbered settings you can actually repeat. ` +
          `Without this, our adjustment advice is difficult to act on.`,
        solutionText:
          `A good burr grinder with numbered settings makes every other variable more controllable. ` +
          `The Timemore C3 Pro is one of the best value options at its price — consistent grind, easy to adjust, and it'll outlast most machines.`,
        productName: 'Timemore C3 Pro',
        productPrice: '~$89',
        affiliateUrl: 'https://www.coffeebrew.coach/api/gear/timemore-c3-pro',
      };
  }
}

// ─── Detection helpers ────────────────────────────────────────────────────────

function isDoseMissing(dose?: string): boolean {
  if (!dose?.trim()) return true;
  return !/\d/.test(dose); // "a scoop", "tablespoon" etc.
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
};

/**
 * Called after every successful dial-in.
 * Increments miss counters for blank/imprecise fields; resets when the user logs them.
 */
export async function recordBrewFields(fields: BrewFields): Promise<void> {
  const [missedDose, missedTemp, missedGrinder] = await Promise.all([
    getItem<number>(KEYS.MISS_DOSE),
    getItem<number>(KEYS.MISS_TEMP),
    getItem<number>(KEYS.MISS_GRINDER),
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
  ]);
}

/**
 * Returns gear items for fields missing >= MISS_THRESHOLD times.
 * Returns empty array if the user dismissed recently.
 */
export async function getActiveRecommendations(): Promise<GearItem[]> {
  const [missedDose, missedTemp, missedGrinder, dismissedAt] = await Promise.all([
    getItem<number>(KEYS.MISS_DOSE),
    getItem<number>(KEYS.MISS_TEMP),
    getItem<number>(KEYS.MISS_GRINDER),
    getItem<string>(KEYS.DISMISSED_AT),
  ]);

  if (dismissedAt) {
    const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / 86_400_000;
    if (daysSince < DISMISS_DAYS) return [];
  }

  const items: GearItem[] = [];
  if ((missedDose    ?? 0) >= MISS_THRESHOLD) items.push(buildGearItem('scale',   missedDose!));
  if ((missedTemp    ?? 0) >= MISS_THRESHOLD) items.push(buildGearItem('kettle',  missedTemp!));
  if ((missedGrinder ?? 0) >= MISS_THRESHOLD) items.push(buildGearItem('grinder', missedGrinder!));

  return items;
}

/** Call when the user dismisses the gear screen. */
export async function dismissGearRecommendations(): Promise<void> {
  await setItem(KEYS.DISMISSED_AT, new Date().toISOString());
}
