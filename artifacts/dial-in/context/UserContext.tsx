import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getItem, generateId, KEYS, setItem, removeItem } from '@/lib/storage';

export interface SavedCoffee {
  id: string;
  coffeeName: string;
  method: string;
  dose: string;
  water: string;
  brewTime: string;
  waterTemp: string;
  grinderNotes: string;
  advice: string;
  adjustment: string;
  savedAt: string;
  adjustmentHistory: string[];
}

interface UserState {
  email: string | null;
  anonId: string | null;
  isPro: boolean;
  usesRemaining: number | null;
  monthlyLimit: number;
  savedCoffees: SavedCoffee[];
  referralCode: string | null;
  isLoaded: boolean;
}

interface UserContextValue extends UserState {
  setEmail: (email: string) => Promise<void>;
  ensureAnonId: () => Promise<string>;
  updateUserStats: (isPro: boolean, usesThisMonth: number, monthlyLimit: number) => void;
  setReferralCode: (code: string) => void;
  addOrUpdateCoffee: (coffee: SavedCoffee) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserState>({
    email: null,
    anonId: null,
    isPro: false,
    usesRemaining: null,
    monthlyLimit: 10,
    savedCoffees: [],
    referralCode: null,
    isLoaded: false,
  });

  useEffect(() => {
    async function load() {
      const [email, anonId, savedCoffees, isPro] = await Promise.all([
        getItem<string>(KEYS.EMAIL),
        getItem<string>(KEYS.ANON_ID),
        getItem<SavedCoffee[]>(KEYS.SAVED_COFFEES),
        getItem<boolean>(KEYS.IS_PRO),
      ]);
      setState(prev => ({
        ...prev,
        email,
        anonId,
        isPro: isPro ?? false,
        savedCoffees: savedCoffees ?? [],
        isLoaded: true,
      }));
    }
    load();
  }, []);

  const setEmail = useCallback(async (email: string) => {
    await setItem(KEYS.EMAIL, email);
    setState(prev => ({ ...prev, email }));
  }, []);

  const ensureAnonId = useCallback(async (): Promise<string> => {
    if (state.anonId) return state.anonId;
    const existing = await getItem<string>(KEYS.ANON_ID);
    if (existing) {
      setState(prev => ({ ...prev, anonId: existing }));
      return existing;
    }
    const newId = generateId();
    await setItem(KEYS.ANON_ID, newId);
    setState(prev => ({ ...prev, anonId: newId }));
    return newId;
  }, [state.anonId]);

  const updateUserStats = useCallback((isPro: boolean, usesThisMonth: number, monthlyLimit: number) => {
    const usesRemaining = Math.max(0, monthlyLimit - usesThisMonth);
    setItem(KEYS.IS_PRO, isPro);
    setState(prev => ({ ...prev, isPro, usesRemaining, monthlyLimit }));
  }, []);

  const setReferralCode = useCallback((code: string) => {
    setState(prev => ({ ...prev, referralCode: code }));
  }, []);

  const addOrUpdateCoffee = useCallback(async (coffee: SavedCoffee) => {
    setState(prev => {
      const existing = prev.savedCoffees.findIndex(c => c.id === coffee.id);
      let updated: SavedCoffee[];
      if (existing >= 0) {
        updated = [...prev.savedCoffees];
        updated[existing] = coffee;
      } else {
        updated = [coffee, ...prev.savedCoffees];
      }
      setItem(KEYS.SAVED_COFFEES, updated);
      return { ...prev, savedCoffees: updated };
    });
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      removeItem(KEYS.EMAIL),
      removeItem(KEYS.ANON_ID),
      removeItem(KEYS.SAVED_COFFEES),
      removeItem(KEYS.IS_PRO),
    ]);
    setState({
      email: null,
      anonId: null,
      isPro: false,
      usesRemaining: null,
      monthlyLimit: 10,
      savedCoffees: [],
      referralCode: null,
      isLoaded: true,
    });
  }, []);

  return (
    <UserContext.Provider value={{ ...state, setEmail, ensureAnonId, updateUserStats, setReferralCode, addOrUpdateCoffee, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
