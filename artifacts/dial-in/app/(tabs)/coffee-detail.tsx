import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'Grind finer',
  grind_coarser: 'Grind coarser',
  more_coffee: 'Use more coffee',
  less_coffee: 'Use less coffee',
  steep_longer: 'Steep longer',
  steep_shorter: 'Steep shorter',
  none: 'Leave as-is ✓',
};

export default function CoffeeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { coffeeName } = useLocalSearchParams<{ coffeeName: string }>();
  const { savedCoffees } = useUser();

  const sessions = savedCoffees
    .filter(c => (c.coffeeName || c.method) === coffeeName)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  const latest = sessions[0];

  function handleRepeat() {
    if (!latest) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/repeat-brew',
      params: { coffeeId: latest.id },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>
        <Text
          style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}
          numberOfLines={1}
        >
          {coffeeName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.meta}>
          <Text style={[styles.metaMethod, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
            {latest?.method}
          </Text>
          <Text style={[styles.metaCount, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {latest && (
          <View style={[styles.latestCard, { backgroundColor: colors.espresso }]}>
            <Text style={[styles.latestLabel, { color: '#A89080', fontFamily: 'DMSans_500Medium' }]}>
              LATEST ADVICE
            </Text>
            <Text style={[styles.latestAdvice, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>
              {latest.advice}
            </Text>
            {latest.adjustment && latest.adjustment !== 'none' && (
              <View style={[styles.adjustPill, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={[styles.adjustText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                  → {ADJUSTMENT_LABELS[latest.adjustment] ?? latest.adjustment}
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={[styles.historyTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Brew history
        </Text>

        {sessions.map((session, i) => {
          const date = new Date(session.savedAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
          const adjLabel = ADJUSTMENT_LABELS[session.adjustment] ?? session.adjustment;

          return (
            <View
              key={session.id}
              style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.sessionTop}>
                <Text style={[styles.sessionNum, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Session {sessions.length - i}
                </Text>
                <Text style={[styles.sessionDate, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  {date}
                </Text>
              </View>
              <Text style={[styles.sessionAdvice, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
                {session.advice}
              </Text>
              <View style={[styles.sessionPill, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.sessionPillText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                  → {adjLabel}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.brewAgainBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleRepeat}
        >
          <Text style={[styles.brewAgainText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
            Brew this again →
          </Text>
        </Pressable>
      </View>
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
  topTitle: { fontSize: 17, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaMethod: { fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaCount: { fontSize: 14 },
  latestCard: {
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  latestLabel: { fontSize: 11, letterSpacing: 1 },
  latestAdvice: { fontSize: 20, lineHeight: 28 },
  adjustPill: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  adjustText: { fontSize: 14 },
  historyTitle: { fontSize: 18, marginTop: 4 },
  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionNum: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionDate: { fontSize: 12 },
  sessionAdvice: { fontSize: 15, lineHeight: 22 },
  sessionPill: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  sessionPillText: { fontSize: 13 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  brewAgainBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  brewAgainText: { fontSize: 17 },
});
