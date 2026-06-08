import { getItem, setItem } from './storage';

export type BadgeId =
  // Brew count milestones
  | 'first_sip'
  | 'getting_dialed'
  | 'ten_strong'
  | 'home_barista'
  | 'coffee_nerd'
  | 'master_brewer'
  // Method variety
  | 'method_explorer'
  | 'method_master'
  | 'globetrotter'
  // Method depth
  | 'pour_over_pro'
  | 'espresso_ace'
  // Quality / skill
  | 'perfectionist'
  | 'sweet_spot'
  | 'consistent_cup'
  // Time of day
  | 'early_bird'
  | 'morning_ritual'
  | 'night_owl'
  // Day variety
  | 'weekend_warrior'
  // Streaks
  | 'streak_3'
  | 'streak_7'
  // Variety
  | 'origin_hunter'
  // Social
  | 'coffee_evangelist';

export interface Badge {
  id: BadgeId;
  emoji: string;
  title: string;
  description: string;
  /** Short celebration line shown in the pop-up */
  celebration: string;
}

export const ALL_BADGES: Badge[] = [
  // ── Brew count milestones ──────────────────────────────
  {
    id: 'first_sip',
    emoji: '🌱',
    title: 'First Sip',
    description: 'Complete your first coached brew',
    celebration: 'The journey begins. Every great barista had a first cup.',
  },
  {
    id: 'getting_dialed',
    emoji: '☕',
    title: 'Getting Dialed',
    description: 'Complete 5 brews',
    celebration: 'You\'re building the habit. Your palate is already sharper.',
  },
  {
    id: 'ten_strong',
    emoji: '⚡',
    title: 'Ten Strong',
    description: 'Complete 10 brews',
    celebration: 'Double digits. You\'re serious about your cup.',
  },
  {
    id: 'home_barista',
    emoji: '🏠',
    title: 'Home Barista',
    description: 'Complete 25 brews',
    celebration: 'Your kitchen is officially a café. No tips required.',
  },
  {
    id: 'coffee_nerd',
    emoji: '🤓',
    title: 'Coffee Nerd',
    description: 'Complete 50 brews',
    celebration: 'You\'ve earned the title. Wear it with pride.',
  },
  {
    id: 'master_brewer',
    emoji: '🏆',
    title: 'Master Brewer',
    description: 'Complete 100 brews',
    celebration: 'One hundred brews. You are the coffee.',
  },

  // ── Method variety ─────────────────────────────────────
  {
    id: 'method_explorer',
    emoji: '🗺️',
    title: 'Method Explorer',
    description: 'Brew with 3 different methods',
    celebration: 'Three methods down. The world of coffee is opening up.',
  },
  {
    id: 'method_master',
    emoji: '🌍',
    title: 'Method Master',
    description: 'Brew with 5 different methods',
    celebration: 'Five methods. You speak fluent coffee.',
  },
  {
    id: 'globetrotter',
    emoji: '✈️',
    title: 'Globetrotter',
    description: 'Brew with 7 different methods',
    celebration: 'Seven methods. At this point you just need a passport.',
  },

  // ── Method depth ───────────────────────────────────────
  {
    id: 'pour_over_pro',
    emoji: '🫗',
    title: 'Pour Over Pro',
    description: 'Complete 10 pour-over brews',
    celebration: 'Your pour is smooth, your bloom is perfect. Well done.',
  },
  {
    id: 'espresso_ace',
    emoji: '🎯',
    title: 'Espresso Ace',
    description: 'Complete 10 espresso brews',
    celebration: 'Crema, body, finish. You\'ve dialled in the dark arts.',
  },

  // ── Quality / skill ────────────────────────────────────
  {
    id: 'perfectionist',
    emoji: '✨',
    title: 'Perfectionist',
    description: 'Nail a brew — get a "leave it as-is" result',
    celebration: 'The coach said leave it alone. That\'s a great cup.',
  },
  {
    id: 'sweet_spot',
    emoji: '💎',
    title: 'Sweet Spot',
    description: 'Get a "leave it as-is" result 3 times',
    celebration: 'Three perfect brews. Your consistency is showing.',
  },
  {
    id: 'consistent_cup',
    emoji: '📐',
    title: 'Consistent Cup',
    description: 'Dial in the same coffee 5 times in a row',
    celebration: 'Five sessions, same beans. That\'s mastery.',
  },

  // ── Time of day ────────────────────────────────────────
  {
    id: 'early_bird',
    emoji: '🌅',
    title: 'Early Bird',
    description: 'Brew before 7am',
    celebration: 'Before the world wakes up, you\'re already dialled in.',
  },
  {
    id: 'morning_ritual',
    emoji: '☀️',
    title: 'Morning Ritual',
    description: 'Brew before 8am five times',
    celebration: 'Five early mornings. This isn\'t a hobby — it\'s a ritual.',
  },
  {
    id: 'night_owl',
    emoji: '🦉',
    title: 'Night Owl',
    description: 'Brew after 10pm',
    celebration: 'Late night coffee is a lifestyle. We respect it.',
  },

  // ── Day variety ────────────────────────────────────────
  {
    id: 'weekend_warrior',
    emoji: '🏄',
    title: 'Weekend Warrior',
    description: 'Brew on a weekend',
    celebration: 'Weekend coffee hits different. Enjoy the slow morning.',
  },

  // ── Streaks ────────────────────────────────────────────
  {
    id: 'streak_3',
    emoji: '🔥',
    title: 'On a Roll',
    description: 'Brew 3 days in a row',
    celebration: 'Three days straight. The streak is alive.',
  },
  {
    id: 'streak_7',
    emoji: '🌟',
    title: 'Week of Brews',
    description: 'Brew 7 days in a row',
    celebration: 'A full week without missing a day. That\'s dedication.',
  },

  // ── Variety ────────────────────────────────────────────
  {
    id: 'origin_hunter',
    emoji: '🌍',
    title: 'Origin Hunter',
    description: 'Try 5 different coffees',
    celebration: 'Five different coffees. Your palate is travelling the world.',
  },

  // ── Social ─────────────────────────────────────────────
  {
    id: 'coffee_evangelist',
    emoji: '📣',
    title: 'Coffee Evangelist',
    description: 'Share a brew tip',
    celebration: 'You spread the gospel of good coffee. The world thanks you.',
  },
];

// ── Storage keys ───────────────────────────────────────────
const TOTAL_BREW_COUNT_KEY  = 'dialin_total_brew_count';
const EARNED_BADGES_KEY     = 'dialin_earned_badges';
const METHODS_USED_KEY      = 'dialin_methods_used';
const COFFEE_BREW_COUNTS_KEY = 'dialin_coffee_brew_counts';
const PERFECT_BREWS_KEY     = 'dialin_perfect_brews';
const EARLY_MORNING_KEY     = 'dialin_early_morning_count';
const METHOD_BREW_COUNTS_KEY = 'dialin_method_brew_counts';
const UNIQUE_COFFEES_KEY    = 'dialin_unique_coffees';
const STREAK_KEY            = 'dialin_streak';

interface StreakData {
  currentStreak: number;
  lastBrewDate: string; // 'YYYY-MM-DD'
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const POUR_OVER_TERMS = ['v60', 'chemex', 'kalita', 'pour over', 'pourover', 'origami', 'melitta', 'clever'];
const ESPRESSO_TERMS  = ['espresso', 'moka', 'aeropress'];

function isPourOver(method: string): boolean {
  const m = method.toLowerCase();
  return POUR_OVER_TERMS.some(t => m.includes(t));
}

function isEspresso(method: string): boolean {
  const m = method.toLowerCase();
  return ESPRESSO_TERMS.some(t => m.includes(t));
}

// ── Public read helpers ────────────────────────────────────

export async function getEarnedBadgeIds(): Promise<BadgeId[]> {
  return (await getItem<BadgeId[]>(EARNED_BADGES_KEY)) ?? [];
}

export async function getTotalBrewCount(): Promise<number> {
  return (await getItem<number>(TOTAL_BREW_COUNT_KEY)) ?? 0;
}

export async function getCurrentStreak(): Promise<number> {
  const s = await getItem<StreakData>(STREAK_KEY);
  return s?.currentStreak ?? 0;
}

// ── Core award function ────────────────────────────────────

export async function checkAndAwardBadges(params: {
  method: string;
  coffeeName: string;
  adjustment: string;
}): Promise<Badge[]> {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const [
    total,
    earnedIds,
    methodsArr,
    coffeeCountsRaw,
    perfectRaw,
    earlyMorningRaw,
    methodBrewCountsRaw,
    uniqueCoffeesRaw,
    streakRaw,
  ] = await Promise.all([
    getItem<number>(TOTAL_BREW_COUNT_KEY),
    getItem<BadgeId[]>(EARNED_BADGES_KEY),
    getItem<string[]>(METHODS_USED_KEY),
    getItem<Record<string, number>>(COFFEE_BREW_COUNTS_KEY),
    getItem<number>(PERFECT_BREWS_KEY),
    getItem<number>(EARLY_MORNING_KEY),
    getItem<Record<string, number>>(METHOD_BREW_COUNTS_KEY),
    getItem<string[]>(UNIQUE_COFFEES_KEY),
    getItem<StreakData>(STREAK_KEY),
  ]);

  const newTotal = (total ?? 0) + 1;
  const alreadyEarned = new Set<BadgeId>(earnedIds ?? []);
  const methodsUsed = new Set<string>(methodsArr ?? []);
  const coffeeCounts: Record<string, number> = coffeeCountsRaw ?? {};
  const methodBrewCounts: Record<string, number> = methodBrewCountsRaw ?? {};
  const uniqueCoffees = new Set<string>(uniqueCoffeesRaw ?? []);

  // Perfect brews
  const isPerfect = params.adjustment === 'none';
  const newPerfectCount = (perfectRaw ?? 0) + (isPerfect ? 1 : 0);

  // Early morning brews (before 8am)
  const newEarlyCount = (earlyMorningRaw ?? 0) + (hour < 8 ? 1 : 0);

  // Method tracking
  methodsUsed.add(params.method);
  methodBrewCounts[params.method] = (methodBrewCounts[params.method] ?? 0) + 1;

  // Coffee tracking
  const coffeeKey = params.coffeeName.trim().toLowerCase() || params.method.toLowerCase();
  coffeeCounts[coffeeKey] = (coffeeCounts[coffeeKey] ?? 0) + 1;
  if (params.coffeeName.trim()) uniqueCoffees.add(params.coffeeName.trim().toLowerCase());

  // Pour-over + espresso counts
  const pourOverCount = Object.entries(methodBrewCounts)
    .filter(([m]) => isPourOver(m))
    .reduce((acc, [, c]) => acc + c, 0);
  const espressoCount = Object.entries(methodBrewCounts)
    .filter(([m]) => isEspresso(m))
    .reduce((acc, [, c]) => acc + c, 0);

  // Streak update
  let streak = streakRaw ?? { currentStreak: 0, lastBrewDate: '' };
  if (streak.lastBrewDate === today) {
    // Already brewed today — streak unchanged
  } else if (streak.lastBrewDate === yesterday) {
    streak = { currentStreak: streak.currentStreak + 1, lastBrewDate: today };
  } else {
    streak = { currentStreak: 1, lastBrewDate: today };
  }

  // ── Check badges ─────────────────────────────────────────
  const newlyEarned: Badge[] = [];

  function check(id: BadgeId, condition: boolean) {
    if (condition && !alreadyEarned.has(id)) {
      const badge = ALL_BADGES.find(b => b.id === id);
      if (badge) {
        alreadyEarned.add(id);
        newlyEarned.push(badge);
      }
    }
  }

  // Brew count milestones
  check('first_sip',      newTotal >= 1);
  check('getting_dialed', newTotal >= 5);
  check('ten_strong',     newTotal >= 10);
  check('home_barista',   newTotal >= 25);
  check('coffee_nerd',    newTotal >= 50);
  check('master_brewer',  newTotal >= 100);

  // Method variety
  check('method_explorer', methodsUsed.size >= 3);
  check('method_master',   methodsUsed.size >= 5);
  check('globetrotter',    methodsUsed.size >= 7);

  // Method depth
  check('pour_over_pro',  pourOverCount >= 10);
  check('espresso_ace',   espressoCount >= 10);

  // Quality / skill
  check('perfectionist',   isPerfect);
  check('sweet_spot',      newPerfectCount >= 3);
  check('consistent_cup',  coffeeCounts[coffeeKey] >= 5);

  // Time of day
  check('early_bird',     hour < 7);
  check('morning_ritual', newEarlyCount >= 5);
  check('night_owl',      hour >= 22);

  // Day variety
  check('weekend_warrior', isWeekend);

  // Streaks
  check('streak_3', streak.currentStreak >= 3);
  check('streak_7', streak.currentStreak >= 7);

  // Variety
  check('origin_hunter', uniqueCoffees.size >= 5);

  // ── Persist ───────────────────────────────────────────────
  await Promise.all([
    setItem(TOTAL_BREW_COUNT_KEY,   newTotal),
    setItem(EARNED_BADGES_KEY,      Array.from(alreadyEarned)),
    setItem(METHODS_USED_KEY,       Array.from(methodsUsed)),
    setItem(COFFEE_BREW_COUNTS_KEY, coffeeCounts),
    setItem(PERFECT_BREWS_KEY,      newPerfectCount),
    setItem(EARLY_MORNING_KEY,      newEarlyCount),
    setItem(METHOD_BREW_COUNTS_KEY, methodBrewCounts),
    setItem(UNIQUE_COFFEES_KEY,     Array.from(uniqueCoffees)),
    setItem(STREAK_KEY,             streak),
  ]);

  return newlyEarned;
}

/** Call this after a user successfully shares a tip. */
export async function awardSocialBadge(): Promise<Badge | null> {
  const earnedIds = (await getItem<BadgeId[]>(EARNED_BADGES_KEY)) ?? [];
  if (earnedIds.includes('coffee_evangelist')) return null;
  const badge = ALL_BADGES.find(b => b.id === 'coffee_evangelist')!;
  await setItem(EARNED_BADGES_KEY, [...earnedIds, 'coffee_evangelist']);
  return badge;
}
