import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { SavedCoffee } from '@/context/UserContext';

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'Grind finer',
  grind_coarser: 'Grind coarser',
  more_coffee: 'Use more coffee',
  less_coffee: 'Use less coffee',
  steep_longer: 'Steep longer',
  steep_shorter: 'Steep shorter',
  none: 'Leave as-is',
};

interface BrewCardProps {
  coffee: SavedCoffee;
  onPress: () => void;
}

export function BrewCard({ coffee, onPress }: BrewCardProps) {
  const colors = useColors();

  const displayName = coffee.coffeeName || coffee.method;
  const date = new Date(coffee.savedAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const adjustmentLabel = ADJUSTMENT_LABELS[coffee.adjustment] ?? coffee.adjustment;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <Text style={[styles.name, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>{dateStr}</Text>
      </View>
      <View style={styles.bottom}>
        <Text style={[styles.method, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>{coffee.method}</Text>
        <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.pillText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
            → {adjustmentLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 13,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  method: {
    fontSize: 13,
  },
  pill: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 13,
  },
});
