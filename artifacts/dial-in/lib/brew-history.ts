import type { SavedCoffee } from '@/context/UserContext';

/** Free users see only their most recent brews; Pro unlocks the full history.
 *  All brews stay in local storage (and on the server) regardless, so
 *  upgrading instantly reveals everything. */
export const FREE_HISTORY_LIMIT = 3;

export function visibleBrews(
  coffees: SavedCoffee[],
  isPro: boolean,
): { visible: SavedCoffee[]; hiddenCount: number } {
  if (isPro) return { visible: coffees, hiddenCount: 0 };
  const sorted = [...coffees].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
  return {
    visible: sorted.slice(0, FREE_HISTORY_LIMIT),
    hiddenCount: Math.max(0, coffees.length - FREE_HISTORY_LIMIT),
  };
}
