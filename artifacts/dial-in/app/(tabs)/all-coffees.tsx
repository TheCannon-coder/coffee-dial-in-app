import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useUser, SavedCoffee } from '@/context/UserContext';
import { useSubscription } from '@/lib/revenuecat';
import { visibleBrews } from '@/lib/brew-history';
import { CoffeeFolder } from '@/components/CoffeeFolder';

function groupCoffees(coffees: SavedCoffee[]): { name: string; sessions: SavedCoffee[] }[] {
  const map = new Map<string, SavedCoffee[]>();
  for (const c of coffees) {
    const key = c.coffeeName || c.method;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.entries())
    .map(([name, sessions]) => ({
      name,
      sessions: sessions.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    }))
    .sort((a, b) => new Date(b.sessions[0].savedAt).getTime() - new Date(a.sessions[0].savedAt).getTime());
}

export default function AllCoffeesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedCoffees, isPro: isProFromDB } = useUser();
  const { isSubscribed } = useSubscription();
  const isPro = isProFromDB || isSubscribed;

  const { visible, hiddenCount } = visibleBrews(savedCoffees, isPro);
  const coffeeGroups = groupCoffees(visible);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          All coffees
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {coffeeGroups.map(group => (
          <CoffeeFolder
            key={group.name}
            coffeeName={group.name}
            sessions={group.sessions}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/coffee-detail', params: { coffeeName: group.name } });
            }}
          />
        ))}

        {hiddenCount > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/paywall');
            }}
            style={({ pressed }) => [
              styles.lockedRow,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.lockedTitle, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                {hiddenCount} older brew{hiddenCount !== 1 ? 's' : ''} in your history
              </Text>
              <Text style={[styles.lockedSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                Free accounts keep the last 3 — go Pro for unlimited brew history
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17 },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  lockedTitle: { fontSize: 15 },
  lockedSub: { fontSize: 13, marginTop: 2 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
