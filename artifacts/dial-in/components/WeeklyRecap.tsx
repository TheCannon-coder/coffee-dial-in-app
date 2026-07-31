import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { SavedCoffee } from '@/context/UserContext';

interface Recap {
  brews: number;
  coffees: number;
  topMethod: string | null;
}

export function computeRecap(coffees: SavedCoffee[], now: Date = new Date()): Recap {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recent = coffees.filter(c => new Date(c.savedAt) >= weekAgo);

  const methodCounts = new Map<string, number>();
  const names = new Set<string>();
  for (const c of recent) {
    names.add(c.coffeeName || c.method);
    methodCounts.set(c.method, (methodCounts.get(c.method) ?? 0) + 1);
  }
  let topMethod: string | null = null;
  let top = 0;
  for (const [m, n] of methodCounts) if (n > top) { top = n; topMethod = m; }

  return { brews: recent.length, coffees: names.size, topMethod };
}

/** "Your week in coffee" card — shown once there are at least 2 brews in the
 *  last 7 days, with a share button for word-of-mouth. */
export function WeeklyRecap({ coffees }: { coffees: SavedCoffee[] }) {
  const colors = useColors();
  const recap = computeRecap(coffees);
  if (recap.brews < 2) return null;

  const line = [
    `${recap.brews} brew${recap.brews !== 1 ? 's' : ''}`,
    `${recap.coffees} coffee${recap.coffees !== 1 ? 's' : ''}`,
    recap.topMethod ? `${recap.topMethod} on repeat` : null,
  ].filter(Boolean).join(' · ');

  async function shareRecap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `My week in coffee ☕ ${line} — brewing better cups with Coffee Brew Coach. coffeebrew.coach`,
      });
    } catch {}
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Your week in coffee
        </Text>
        <Text style={[styles.stats, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          {line}
        </Text>
      </View>
      <Pressable
        onPress={shareRecap}
        hitSlop={8}
        style={({ pressed }) => [styles.shareBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
      >
        <Feather name="share" size={16} color={colors.cream} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  stats: { fontSize: 17, marginTop: 4 },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
