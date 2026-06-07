import { getItem, setItem } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GearProduct = {
  name: string;
  price: string;
  stars: string;
  reviewCount: string;
  tag: string;
  /** Goes through your affiliate redirect — update the Vercel endpoint to set the real URL */
  affiliateUrl: string;
};

export type GearItem = {
  id: 'scale' | 'kettle' | 'grinder';
  emoji: string;
  name: string;
  missCount: number;
  why: string;
  products: GearProduct[];
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  MISS_DOSE:       'gear_miss_dose',
  MISS_TEMP:       'gear_miss_temp',
  MISS_GRINDER:    'gear_miss_grinder',
  DISMISSED_AT:    'gear_dismissed_at',
} as const;

/** Threshold: show recommendation after this many brews with a field missing. */
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
        name: 'Coffee scale',
        missCount,
        why: `You've logged ${missCount} brew${missCount !== 1 ? 's' : ''} without a dose in grams. Without weighing, your ratio drifts every session — a scale is the single biggest jump in consistency you can make.`,
        products: [
          {
            name: 'Timemore Black Mirror',
            price: '$75',
            stars: '4.7',
            reviewCount: '1.2k',
            tag: 'Best value',
            affiliateUrl: 'https://www.coffeebrew.coach/api/gear/timemore-black-mirror',
          },
          {
            name: 'Acaia Pearl',
            price: '$195',
            stars: '4.8',
            reviewCount: '3.4k',
            tag: 'Barista favourite',
            affiliateUrl: 'https://www.coffeebrew.coach/api/gear/acaia-pearl',
          },
        ],
      };

    case 'kettle':
      return {
        id,
        emoji: '🌡️',
        name: 'Temperature kettle',
        missCount,
        why: `You've skipped water temperature ${missCount} time${missCount !== 1 ? 's' : ''}. Temperature is one of the biggest levers in extraction — too hot is bitter, too cool is sour. A smart kettle hits the exact degree every time.`,
        products: [
          {
            name: 'Fellow Stagg EKG',
            price: '$165',
            stars: '4.8',
            reviewCount: '2.4k',
            tag: 'Our pick',
            affiliateUrl: 'https://www.coffeebrew.coach/api/gear/fellow-stagg-ekg',
          },
          {
            name: 'Bonavita 1L Variable',
            price: '$49',
            stars: '4.5',
            reviewCount: '5.1k',
            tag: 'Budget pick',
            affiliateUrl: 'https://www.coffeebrew.coach/api/gear/bonavita-variable',
          },
        ],
      };

    case 'grinder':
      return {
        id,
        emoji: '⚙️',
        name: 'Burr grinder with settings',
        missCount,
        why: `You haven't logged a grinder setting in ${missCount} brew${missCount !== 1 ? 's' : ''}. When we say "grind finer", you need a grinder with numbered settings to act on it. A good burr grinder is the upgrade that makes every other variable matter more.`,
        products: [
          {
            name: 'Timemore C3 Pro',
            price: '$89',
            stars: '4.7',
            reviewCount: '1.1k',
            tag: 'Best value',
            affiliateUrl: 'https://www.coffeebrew.coach/api/gear/timemore-c3-pro',
          },
          {
            name: 'Fellow Ode Gen 2',
            price: '$299',
            stars: '4.9',
            reviewCount: '890',
            tag: 'Top rated',
            affiliateUrl: 'https://www.coffeebrew.coach/api/gear/fellow-ode-gen2',
          },
        ],
      };
  }
}

// ─── Detection helpers ────────────────────────────────────────────────────────

/** Returns true if the dose is missing or not in grams (no digit found). */
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
 * Increments the miss counter for each field that was blank / imprecise.
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
      : setItem(KEYS.MISS_DOSE, 0), // reset when they do log it
    isTempMissing(fields.waterTemp)
      ? setItem(KEYS.MISS_TEMP, (missedTemp ?? 0) + 1)
      : setItem(KEYS.MISS_TEMP, 0),
    isGrinderMissing(fields.grinderNotes)
      ? setItem(KEYS.MISS_GRINDER, (missedGrinder ?? 0) + 1)
      : setItem(KEYS.MISS_GRINDER, 0),
  ]);
}

/**
 * Returns gear recommendations for fields that have been missing >= MISS_THRESHOLD times.
 * Returns empty array if the user dismissed recently.
 */
export async function getActiveRecommendations(): Promise<GearItem[]> {
  const [missedDose, missedTemp, missedGrinder, dismissedAt] = await Promise.all([
    getItem<number>(KEYS.MISS_DOSE),
    getItem<number>(KEYS.MISS_TEMP),
    getItem<number>(KEYS.MISS_GRINDER),
    getItem<string>(KEYS.DISMISSED_AT),
  ]);

  // Respect dismissal window
  if (dismissedAt) {
    const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / 86_400_000;
    if (daysSince < DISMISS_DAYS) return [];
  }

  const items: GearItem[] = [];
  const dose = missedDose ?? 0;
  const temp = missedTemp ?? 0;
  const grinder = missedGrinder ?? 0;

  if (dose >= MISS_THRESHOLD)    items.push(buildGearItem('scale',   dose));
  if (temp >= MISS_THRESHOLD)    items.push(buildGearItem('kettle',  temp));
  if (grinder >= MISS_THRESHOLD) items.push(buildGearItem('grinder', grinder));

  return items;
}

/** Call when the user taps "Not now" or dismisses the gear screen. */
export async function dismissGearRecommendations(): Promise<void> {
  await setItem(KEYS.DISMISSED_AT, new Date().toISOString());
}
