import type { SavedCoffee } from '@/context/UserContext';

/** Local-date key (YYYY-MM-DD) so a late-night brew counts for the right day. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number, from: Date): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

export interface BrewStreak {
  /** Consecutive brew days ending today or yesterday (yesterday keeps the
   *  streak alive until midnight so it never dies while the user still has
   *  time to brew). */
  current: number;
  /** Whether the user has already brewed today. */
  brewedToday: boolean;
}

export function computeStreak(coffees: SavedCoffee[], now: Date = new Date()): BrewStreak {
  const days = new Set(coffees.map(c => dayKey(new Date(c.savedAt))));
  const brewedToday = days.has(dayKey(now));

  // Anchor on today if brewed, else yesterday; no anchor → no streak.
  let offset = brewedToday ? 0 : 1;
  if (!days.has(daysAgo(offset, now))) return { current: 0, brewedToday };

  let current = 0;
  while (days.has(daysAgo(offset + current, now))) current++;
  return { current, brewedToday };
}
