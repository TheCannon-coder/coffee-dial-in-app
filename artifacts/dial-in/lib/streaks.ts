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
  /** Brew days in the current streak (sleep-in days don't add to the count,
   *  they just keep the chain alive). */
  current: number;
  /** Whether the user has already brewed today. */
  brewedToday: boolean;
  /** True when the streak is only alive because yesterday was bridged by a
   *  sleep-in — i.e. brewing today is what saves it. */
  onGrace: boolean;
}

/**
 * Streak with "sleep-ins": a single missed day doesn't break the chain, at
 * most once per rolling 7 days (the Duolingo streak-freeze, coffee edition —
 * a Sunday sleep-in shouldn't cost a week of momentum). Two missed days in a
 * row always break it. Yesterday still keeps a streak alive until midnight.
 */
export function computeStreak(coffees: SavedCoffee[], now: Date = new Date()): BrewStreak {
  const days = new Set(coffees.map(c => dayKey(new Date(c.savedAt))));
  const brewedToday = days.has(dayKey(now));

  // Anchor on today, else yesterday, else bridge yesterday with a sleep-in.
  let offset: number;
  let onGrace = false;
  let lastBridgeAt = -Infinity;
  if (brewedToday) {
    offset = 0;
  } else if (days.has(daysAgo(1, now))) {
    offset = 1;
  } else if (days.has(daysAgo(2, now))) {
    offset = 2;
    onGrace = true;
    lastBridgeAt = 1;
  } else {
    return { current: 0, brewedToday, onGrace: false };
  }

  let current = 0;
  let i = offset;
  for (;;) {
    if (days.has(daysAgo(i, now))) {
      current++;
      i++;
      continue;
    }
    // Single-day gap: bridge it if the day beyond exists and no sleep-in was
    // spent within the last 7 days of the chain.
    if (i - lastBridgeAt >= 7 && days.has(daysAgo(i + 1, now))) {
      lastBridgeAt = i;
      i++;
      continue;
    }
    break;
  }

  return { current, brewedToday, onGrace };
}
