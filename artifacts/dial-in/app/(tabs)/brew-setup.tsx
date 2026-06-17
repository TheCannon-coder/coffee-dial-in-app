import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { BrewTimer } from '@/components/BrewTimer';
import { FormField } from '@/components/FormField';

const BREW_METHODS = [
  'Pour over', 'V60', 'Chemex', 'Kalita Wave',
  'French press', 'AeroPress', 'Espresso',
  'Moka pot', 'Cold brew', 'Drip machine', 'Other',
];

export default function BrewSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    coffeeName?: string;
    method?: string;
    dose?: string;
    water?: string;
    brewTime?: string;
    waterTemp?: string;
    grinderNotes?: string;
    adjustmentHistory?: string;
    isRepeat?: string;
  }>();

  const [coffeeName, setCoffeeName] = useState(params.coffeeName ?? '');
  const [method, setMethod] = useState(params.method ?? 'V60');
  const [dose, setDose] = useState(params.dose ?? '');
  const [water, setWater] = useState(params.water ?? '');
  const [brewTime, setBrewTime] = useState(params.brewTime ?? '');
  const [waterTemp, setWaterTemp] = useState(params.waterTemp ?? '');
  const [grinderNotes, setGrinderNotes] = useState(params.grinderNotes ?? '');
  const [brewAlong, setBrewAlong] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  const adjustmentHistory: string[] = params.adjustmentHistory
    ? JSON.parse(params.adjustmentHistory)
    : [];

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (brewAlong && !params.isRepeat) {
      router.push({
        pathname: '/brew-along-recipe',
        params: { method, coffeeName, dose, water, brewTime, waterTemp, grinderNotes, adjustmentHistory: JSON.stringify(adjustmentHistory) },
      });
    } else {
      router.push({
        pathname: '/tasting',
        params: { method, coffeeName, dose, water, brewTime, waterTemp, grinderNotes, adjustmentHistory: JSON.stringify(adjustmentHistory) },
      });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Brew setup
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormField label="Coffee name or origin">
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
            placeholder="e.g. Ethiopian Yirgacheffe"
            placeholderTextColor={colors.mutedForeground}
            value={coffeeName}
            onChangeText={setCoffeeName}
          />
        </FormField>

        <FormField label="Brew method">
          <Pressable
            style={[styles.input, styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowMethodPicker(!showMethodPicker)}
          >
            <Text style={{ color: colors.espresso, fontFamily: 'DMSans_400Regular', fontSize: 16 }}>{method}</Text>
            <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
          </Pressable>
          {showMethodPicker && (
            <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {BREW_METHODS.map(m => (
                <Pressable
                  key={m}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setMethod(m); setShowMethodPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, { color: m === method ? colors.accent : colors.espresso, fontFamily: m === method ? 'DMSans_500Medium' : 'DMSans_400Regular' }]}>
                    {m}
                  </Text>
                  {m === method && <Feather name="check" size={16} color={colors.accent} />}
                </Pressable>
              ))}
            </View>
          )}
        </FormField>

        <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.toggleLabel, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
              Brew along with me
            </Text>
            <Text style={[styles.toggleSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Get a starting recipe
            </Text>
          </View>
          <Switch
            value={brewAlong}
            onValueChange={v => { setBrewAlong(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.row}>
          <FormField label="Dose (g)" style={{ flex: 1 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
              placeholder="e.g. 15g"
              placeholderTextColor={colors.mutedForeground}
              value={dose}
              onChangeText={setDose}
            />
          </FormField>
          <FormField label="Water (ml)" style={{ flex: 1 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
              placeholder="e.g. 250"
              placeholderTextColor={colors.mutedForeground}
              value={water}
              onChangeText={setWater}
              keyboardType="numeric"
            />
          </FormField>
        </View>

        <View style={styles.row}>
          <FormField label="Brew time" style={{ flex: 1 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
              placeholder="e.g. 3:00"
              placeholderTextColor={colors.mutedForeground}
              value={brewTime}
              onChangeText={setBrewTime}
            />
          </FormField>
          <FormField label="Water temp" style={{ flex: 1 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
              placeholder="e.g. 93°C"
              placeholderTextColor={colors.mutedForeground}
              value={waterTemp}
              onChangeText={setWaterTemp}
            />
          </FormField>
        </View>

        <View style={styles.timerToggleRow}>
          <Pressable onPress={() => setShowTimer(!showTimer)} style={styles.timerToggle}>
            <Feather name="clock" size={15} color={colors.accent} />
            <Text style={[styles.timerToggleText, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
              {showTimer ? 'Hide timer' : 'Use brew timer'}
            </Text>
          </Pressable>
        </View>
        {showTimer && <BrewTimer onUseTime={t => setBrewTime(t)} />}

        <FormField label="Grinder setting / notes (optional)">
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
            placeholder="Grinder setting, any other notes..."
            placeholderTextColor={colors.mutedForeground}
            value={grinderNotes}
            onChangeText={setGrinderNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </FormField>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.nextBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
            How did it taste? →
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
  topTitle: { fontSize: 17 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  picker: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginTop: 4 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 15 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12 },
  toggleLabel: { fontSize: 15 },
  toggleSub: { fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  timerToggleRow: { marginTop: -4 },
  timerToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerToggleText: { fontSize: 14 },
  textarea: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, minHeight: 80 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  nextBtn: { borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { fontSize: 17 },
});
