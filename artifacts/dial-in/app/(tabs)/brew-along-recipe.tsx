import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

const BASE_RECIPES: Record<string, { dose: string; water: string; temp: string; time: string; notes: string }> = {
  'V60':         { dose: '15g', water: '250ml', temp: '93°C', time: '3:00', notes: 'Bloom 45s with 45ml, then pour in circles' },
  'Pour over':   { dose: '15g', water: '250ml', temp: '93°C', time: '3:30', notes: 'Slow, steady pour' },
  'Chemex':      { dose: '42g', water: '700ml', temp: '94°C', time: '4:30', notes: 'Bloom 90s, pour in 3 stages' },
  'Kalita Wave': { dose: '20g', water: '320ml', temp: '93°C', time: '3:00', notes: 'Bloom 45s, centre pours' },
  'AeroPress':   { dose: '15g', water: '200ml', temp: '85°C', time: '2:00', notes: 'Stir, steep 90s, press slowly' },
  'French press':{ dose: '30g', water: '500ml', temp: '95°C', time: '4:00', notes: 'Stir, steep 4 min, press gently' },
  'Espresso':    { dose: '18g', water: '36ml',  temp: '93°C', time: '0:28', notes: 'Target 1:2 ratio in 25-30s' },
  'Moka pot':    { dose: '20g', water: '200ml', temp: '80°C', time: '5:00', notes: 'Medium heat, watch for light brown flow' },
  'Cold brew':   { dose: '100g',water: '600ml', temp: 'Cold', time: '12h',  notes: 'Steep overnight in fridge' },
  'Drip machine':{ dose: '60g', water: '1000ml',temp: '93°C', time: '6:00', notes: 'Use filtered water' },
};

export default function BrewAlongRecipeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    method: string;
    coffeeName?: string;
    dose?: string;
    water?: string;
    brewTime?: string;
    waterTemp?: string;
    grinderNotes?: string;
    adjustmentHistory?: string;
  }>();

  const recipe = BASE_RECIPES[params.method] ?? BASE_RECIPES['V60'];

  // Use user's values if provided, fall back to recipe defaults
  const displayDose = params.dose?.trim() || recipe.dose;
  const displayWater = params.water?.trim() ? `${params.water}ml` : recipe.water;
  const displayTemp = params.waterTemp?.trim() || recipe.temp;
  const usingUserValues = !!(params.dose?.trim() || params.water?.trim() || params.waterTemp?.trim());

  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/brew-along-active',
      params: {
        method: params.method,
        coffeeName: params.coffeeName ?? '',
        dose: displayDose,
        water: params.water?.trim() || recipe.water.replace('ml', ''),
        waterTemp: displayTemp,
        grinderNotes: params.grinderNotes ?? '',
        adjustmentHistory: params.adjustmentHistory ?? '[]',
      },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>Starting recipe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>Let's start here.</Text>
        <Text style={[styles.sub, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
          {usingUserValues
            ? "Using your brew setup. We can dial it in from here."
            : "A simple starting point. We can dial it in from here."}
        </Text>
        <Text style={[styles.method, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>{params.method}</Text>

        <View style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <RecipeRow icon="package" label="Coffee" value={displayDose} highlight={!!params.dose?.trim()} />
          <RecipeRow icon="droplet" label="Water" value={displayWater} highlight={!!params.water?.trim()} />
          <RecipeRow icon="thermometer" label="Temperature" value={displayTemp} highlight={!!params.waterTemp?.trim()} />
          <RecipeRow icon="clock" label="Brew time" value={recipe.time} highlight={false} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.notesRow}>
            <Text style={[styles.notesLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>Tip</Text>
            <Text style={[styles.notesValue, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>{recipe.notes}</Text>
          </View>
        </View>

        {usingUserValues && (
          <View style={[styles.userNote, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="check-circle" size={14} color={colors.accent} />
            <Text style={[styles.userNoteText, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
              Your values are highlighted. Steps will reflect your recipe.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.nextBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleStart}
        >
          <Text style={[styles.nextBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
            Let's brew →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function RecipeRow({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight: boolean }) {
  const colors = useColors();
  return (
    <View style={rowStyles.row}>
      <Feather name={icon as any} size={16} color={colors.accent} />
      <Text style={[rowStyles.label, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: highlight ? colors.accent : colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14, flex: 1 },
  value: { fontSize: 18 },
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17 },
  scroll: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  headline: { fontSize: 30 },
  sub: { fontSize: 15, lineHeight: 22 },
  method: { fontSize: 14 },
  recipeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    marginTop: 8,
  },
  divider: { height: 1 },
  notesRow: { gap: 4 },
  notesLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  notesValue: { fontSize: 14, lineHeight: 20 },
  userNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userNoteText: { fontSize: 13, flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextBtn: { borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { fontSize: 17 },
});
