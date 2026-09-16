import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { RECIPE_DEFAULTS } from '@/lib/brew-steps';

/** Railroaded first brew: one method pick, one fork, zero forms.
 *  Guided path reuses the brew-along screens with the method's standard
 *  recipe; the coach-me path goes straight to tasting with those defaults. */

// Emoji has no brewing devices (the old set was a moon and a test tube), so
// these use the app's Feather icon language instead: cone, drip, press,
// cup, pressure, power button.
const FIRST_BREW_METHODS: { name: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { name: 'V60', icon: 'filter' },
  { name: 'Chemex', icon: 'droplet' },
  { name: 'AeroPress', icon: 'arrow-down-circle' },
  { name: 'French press', icon: 'coffee' },
  { name: 'Espresso', icon: 'zap' },
  { name: 'Drip machine', icon: 'power' },
];

export default function FirstBrewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customMethod, setCustomMethod] = useState('');

  // Guided brew-along only exists for the known methods; a custom brewer
  // goes straight to coach-me so we never walk someone through the wrong steps.
  const isKnownMethod = method !== null && FIRST_BREW_METHODS.some(m => m.name === method);

  function goGuided(m: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/brew-along-recipe', params: { method: m } });
  }

  function goCoachMe(m: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const d = RECIPE_DEFAULTS[m];
    router.push({
      pathname: '/tasting',
      params: {
        method: m,
        dose: d?.dose ?? '',
        water: d ? String(d.water) : '',
        waterTemp: d?.temp ?? '',
      },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          hitSlop={12}
          onPress={() => {
            if (method) { setMethod(null); return; }
            if (showCustom) { setShowCustom(false); return; }
            router.back();
          }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>

        {showCustom && !method ? (
          <>
            <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              What do you brew with?
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Moka pot, cold brew, siphon, percolator — anything goes.
            </Text>
            <TextInput
              style={[styles.customInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
              placeholder="e.g. Moka pot"
              placeholderTextColor={colors.mutedForeground}
              value={customMethod}
              onChangeText={setCustomMethod}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                const m = customMethod.trim();
                if (m) { setMethod(m); setShowCustom(false); }
              }}
            />
            <Pressable
              disabled={!customMethod.trim()}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setMethod(customMethod.trim());
                setShowCustom(false);
              }}
              style={({ pressed }) => [
                styles.continueBtn,
                { backgroundColor: customMethod.trim() ? colors.espresso : colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.continueBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                Continue →
              </Text>
            </Pressable>
          </>
        ) : !method ? (
          <>
            <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              How do you brew?
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Pick your brewer — we'll handle the rest.
            </Text>
            <View style={styles.grid}>
              {FIRST_BREW_METHODS.map(m => (
                <Pressable
                  key={m.name}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMethod(m.name);
                  }}
                  style={({ pressed }) => [
                    styles.methodCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.methodIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={m.icon} size={22} color={colors.accent} />
                  </View>
                  <Text style={[styles.methodName, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCustom(true);
                }}
                style={({ pressed }) => [
                  styles.methodCard,
                  styles.otherCard,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={[styles.methodIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="more-horizontal" size={22} color={colors.accent} />
                </View>
                <Text style={[styles.methodName, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                  Something else
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              {method} — nice choice.
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Where are you at with today's cup?
            </Text>

            {isKnownMethod && (
            <Pressable
              onPress={() => goGuided(method)}
              style={({ pressed }) => [
                styles.forkCard,
                { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="play-circle" size={22} color={colors.cream} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.forkTitle, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>
                  Walk me through it
                </Text>
                <Text style={[styles.forkSub, { color: colors.cream, opacity: 0.8, fontFamily: 'DMSans_400Regular' }]}>
                  Step-by-step guided brew with a proven starting recipe
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.cream} />
            </Pressable>
            )}

            <Pressable
              onPress={() => goCoachMe(method)}
              style={({ pressed }) => [
                styles.forkCard,
                { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="message-circle" size={22} color={colors.espresso} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.forkTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  I already brewed — coach me
                </Text>
                <Text style={[styles.forkSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Tell us how it tastes and get your first tip
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.espresso} />
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  methodCard: {
    width: '47%',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: { fontSize: 15 },
  otherCard: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  customInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  continueBtn: {
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueBtnText: { fontSize: 15 },
  forkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  forkTitle: { fontSize: 18 },
  forkSub: { fontSize: 13, marginTop: 3 },
});
