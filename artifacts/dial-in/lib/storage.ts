import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  EMAIL: 'dialin_email',
  ANON_ID: 'dialin_anon_id',
  SAVED_COFFEES: 'dialin_saved_coffees',
  REF: 'dialin_ref',
  IS_PRO: 'dialin_is_pro',
  NOTIFICATIONS_ENABLED: 'dialin_notifications_enabled',
  REMINDER_HOUR: 'dialin_reminder_hour',
  REMINDER_MINUTE: 'dialin_reminder_minute',
  BREW_COUNT: 'dialin_brew_count',
  BREW_COUNT_MONTH: 'dialin_brew_count_month',
  WEEK1_NUDGES_SCHEDULED: 'dialin_week1_nudges',
} as const;

export const FREE_BREW_LIMIT = 10;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export async function getBrewCount(): Promise<number> {
  const storedMonth = await getItem<string>(KEYS.BREW_COUNT_MONTH);
  if (storedMonth !== currentMonthKey()) {
    await setItem(KEYS.BREW_COUNT, 0);
    await setItem(KEYS.BREW_COUNT_MONTH, currentMonthKey());
    return 0;
  }
  return (await getItem<number>(KEYS.BREW_COUNT)) ?? 0;
}

export async function incrementBrewCount(): Promise<number> {
  const current = await getBrewCount();
  const next = current + 1;
  await setItem(KEYS.BREW_COUNT, next);
  await setItem(KEYS.BREW_COUNT_MONTH, currentMonthKey());
  return next;
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}
