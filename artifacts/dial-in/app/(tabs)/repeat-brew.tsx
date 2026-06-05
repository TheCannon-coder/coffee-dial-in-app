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
  none: 'Leave it as-is',
};

export default function RepeatBrewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { coffeeId } = useLocalSearchParams<{ coffeeId: string }>();
  const { savedCoffees } = useUser();

  const coffee = savedCoffees.find(c => c.id === coffeeId);

  if (!coffee) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }}>Coffee not found</Text>
      </View>
    );
  }

  const adjustmentLabel = ADJUSTMENT_LABELS[coffee.adjustment] ?? coffee.adjustment;

  function handleBrewIt() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/brew-setup',
      params: {
        coffeeName: coffee!.coffeeName,
        method: coffee!.method,
        dose: coffee!.dose,
        water: coffee!.water,
        brewTime: coffee!.brewTime,
        waterTemp: coffee!.waterTemp,
        grinderNotes: coffee!.grinderNotes,
        adjustmentHistory: JSON.stringify(coffee!.adjustmentHistory),
        isRepeat: '1',
      },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>Brew again</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Here's where{'\n'}we left off.
        </Text>
        <Text style={[styles.sub, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
          Keep everything the same — let's just try this one change.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.coffeeName, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            {coffee.coffeeName || coffee.method}
          </Text>

          <View style={styles.settings}>
            {coffee.method ? <SettingRow icon="coffee" label="Method" value={coffee.method} /> : null}
            {coffee.dose ? <SettingRow icon="package" label="Dose" value={coffee.dose} /> : null}
            {coffee.water ? <SettingRow icon="droplet" label="Water" value={`${coffee.water}ml`} /> : null}
            {coffee.brewTime ? <SettingRow icon="clock" label="Brew time" value={coffee.brewTime} /> : null}
            {coffee.waterTemp ? <SettingRow icon="thermometer" label="Temperature" value={coffee.waterTemp} /> : null}
            {coffee.grinderNotes ? <SettingRow icon="settings" label="Notes" value={coffee.grinderNotes} /> : null}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.adjustmentRow}>
            <Text style={[styles.adjustmentLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Last recommendation
            </Text>
            <View style={[styles.adjustmentPill, { backgroundColor: colors.espresso }]}>
              <Text style={[styles.adjustmentText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                → {adjustmentLabel}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.nextBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleBrewIt}
        >
          <Text style={[styles.nextBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
            Let's brew it →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={settingStyles.row}>
      <Feather name={icon as any} size={14} color={colors.mutedForeground} />
      <Text style={[settingStyles.label, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>{label}</Text>
      <Text style={[settingStyles.value, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>{value}</Text>
    </View>
  );
}

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    flex: 1,
  },
  value: {
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 17 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  headline: {
    fontSize: 30,
    lineHeight: 38,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: -8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  coffeeName: {
    fontSize: 20,
  },
  settings: {
    gap: 10,
  },
  divider: {
    height: 1,
  },
  adjustmentRow: {
    gap: 10,
  },
  adjustmentLabel: {
    fontSize: 13,
  },
  adjustmentPill: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  adjustmentText: {
    fontSize: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 17 },
});
