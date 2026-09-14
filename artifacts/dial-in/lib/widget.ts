import { Platform } from 'react-native';

const APP_GROUP = 'group.com.dialin.coffeecoach';

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface WidgetPlan {
  coffeeName: string;
  tweak: string;
  streak: number;
  brewedToday: boolean;
}

/**
 * Push the current brew plan into the home-screen widget via the shared
 * App Group. Values go over as strings; the widget parses on its side.
 * No-ops safely anywhere the native module doesn't exist (Android, Expo Go,
 * builds that predate the widget).
 */
export function setWidgetPlan(plan: WidgetPlan): void {
  if (Platform.OS !== 'ios') return;
  try {
    // Lazy require: importing at module scope would crash builds without
    // the native module compiled in.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExtensionStorage } = require('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('planCoffee', plan.coffeeName);
    storage.set('planTweak', plan.tweak);
    storage.set('planStreak', String(plan.streak));
    // Stored as a day key so the widget's "brewed today" expires at midnight
    // on its own, without the app being opened.
    storage.set('planBrewedDay', plan.brewedToday ? localDayKey(new Date()) : '');
    ExtensionStorage.reloadWidget();
  } catch {
    // Widget updates are strictly best-effort.
  }
}
