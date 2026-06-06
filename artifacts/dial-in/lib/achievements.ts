import { getItem, setItem, KEYS } from './storage';

export type BadgeId =
  | 'first_sip'
  | 'getting_dialed'
  | 'home_barista'
  | 'coffee_nerd'
  | 'master_brewer'
  | 'method_explorer'
  | 'method_master'
  | 'perfectionist'
  | 'consistent_cup'
  | 'early_bird';

export interface Badge {
  id: BadgeId;
  emoji: string;
  title: string;
  description: string;
}

export const ALL_BADGES: Badge[] = [
  { id: 'first_sip', emoji: '🌱', title: 'First Sip', description: 'Complete your first brew' },
  { id: 'getting_dialed', emoji: '☕', title: 'Getting Dialed', description: 'Complete 5 brews' },
  { id: 'home_barista', emoji: '🏠', title: 'Home Barista', description: 'Complete 25 brews' },
  { id: 'coffee_nerd', emoji: '🤓', title: 'Coffee Nerd', description: 'Complete 50 brews' },
  { id: 'master_brewer', emoji: '🏆', title: 'Master Brewer', description: 'Complete 100 brews' },
  { id: 'method_explorer', emoji: '🗺️', title: 'Method Explorer', description: 'Brew with 3 different methods' },
  { id: 'method_master', emoji: '🌍', title: 'Method Master', description: 'Brew with 5 different methods' },
  { id: 'perfectionist', emoji: '🎯', title: 'Perfectionist', description: 'Get a "leave it as-is" result' },
  { id: 'consistent_cup', emoji: '📐', title: 'Consistent Cup', description: 'Dial in the same coffee 5 times' },
  { id: 'early_bird', emoji: '🌅', title: 'Early Bird', description: 'Brew before 7am' },
];

const TOTAL_BREW_COUNT_KEY = 'dialin_total_brew_count';
const EARNED_BADGES_KEY = 'dialin_earned_badges';
const METHODS_USED_KEY = 'dialin_methods_used';
const COFFEE_BREW_COUNTS_KEY = 'dialin_coffee_brew_counts';

export async function getEarnedBadgeIds(): Promise<BadgeId[]> {
  return (await getItem<BadgeId[]>(EARNED_BADGES_KEY)) ?? [];
}

export async function getTotalBrewCount(): Promise<number> {
  return (await getItem<number>(TOTAL_BREW_COUNT_KEY)) ?? 0;
}

export async function checkAndAwardBadges(params: {
  method: string;
  coffeeName: string;
  adjustment: string;
}): Promise<Badge[]> {
  const [total, earnedIds, methodsArr, coffeeCountsRaw] = await Promise.all([
    getItem<number>(TOTAL_BREW_COUNT_KEY),
    getItem<BadgeId[]>(EARNED_BADGES_KEY),
    getItem<string[]>(METHODS_USED_KEY),
    getItem<Record<string, number>>(COFFEE_BREW_COUNTS_KEY),
  ]);

  const newTotal = (total ?? 0) + 1;
  const alreadyEarned = new Set<BadgeId>(earnedIds ?? []);
  const methodsUsed = new Set<string>(methodsArr ?? []);
  const coffeeCounts: Record<string, number> = coffeeCountsRaw ?? {};

  methodsUsed.add(params.method);

  const coffeeKey = params.coffeeName.trim().toLowerCase() || params.method;
  coffeeCounts[coffeeKey] = (coffeeCounts[coffeeKey] ?? 0) + 1;

  const hour = new Date().getHours();
  const isEarlyBird = hour < 7;

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

  check('first_sip', newTotal >= 1);
  check('getting_dialed', newTotal >= 5);
  check('home_barista', newTotal >= 25);
  check('coffee_nerd', newTotal >= 50);
  check('master_brewer', newTotal >= 100);
  check('method_explorer', methodsUsed.size >= 3);
  check('method_master', methodsUsed.size >= 5);
  check('perfectionist', params.adjustment === 'none');
  check('consistent_cup', coffeeCounts[coffeeKey] >= 5);
  check('early_bird', isEarlyBird);

  await Promise.all([
    setItem(TOTAL_BREW_COUNT_KEY, newTotal),
    setItem(EARNED_BADGES_KEY, Array.from(alreadyEarned)),
    setItem(METHODS_USED_KEY, Array.from(methodsUsed)),
    setItem(COFFEE_BREW_COUNTS_KEY, coffeeCounts),
  ]);

  return newlyEarned;
}
