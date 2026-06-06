import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { SavedCoffee } from '@/context/UserContext';

interface CoffeeFolderProps {
  coffeeName: string;
  sessions: SavedCoffee[];
  onPress: () => void;
}

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'Grind finer',
  grind_coarser: 'Grind coarser',
  more_coffee: 'Use more coffee',
  less_coffee: 'Use less coffee',
  steep_longer: 'Steep longer',
  steep_shorter: 'Steep shorter',
  none: 'Leave as-is',
};

export function CoffeeFolder({ coffeeName, sessions, onPress }: CoffeeFolderProps) {
  const colors = useColors();
  const latest = sessions[0];
  const method = latest.method;
  const lastDate = new Date(latest.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const latestAdjustment = ADJUSTMENT_LABELS[latest.adjustment] ?? latest.adjustment;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.name, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}
            numberOfLines={1}
          >
            {coffeeName}
          </Text>
          {sessions.length > 1 && (
            <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.countText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                {sessions.length}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          {lastDate}
        </Text>
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.method, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
          {method}
        </Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.pillText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
            → {latestAdjustment}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    flexShrink: 1,
  },
  countBadge: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
  },
  date: {
    fontSize: 13,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
