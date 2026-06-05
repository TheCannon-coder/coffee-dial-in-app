import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  EMAIL: 'dialin_email',
  ANON_ID: 'dialin_anon_id',
  SAVED_COFFEES: 'dialin_saved_coffees',
  REF: 'dialin_ref',
  IS_PRO: 'dialin_is_pro',
} as const;

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
