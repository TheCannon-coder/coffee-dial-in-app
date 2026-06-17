import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { FormField } from '@/components/FormField';

export default function PostBrewDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    method: string;
    coffeeName?: string;
    dose?: string;
    water?: string;
    autoTime?: string;
    waterTemp?: string;
    grinderNotes?: string;
    adjustmentHistory?: string;
  }>();

  const [coffeeName, setCoffeeName] = useState(params.coffeeName ?? '');
  const [dose, setDose] = useState(params.dose ?? '');
  const [water, setWater] = useState(params.water ?? '');
  const [brewTime, setBrewTime] = useState(params.autoTime ?? '');
  const [waterTemp, setWaterTemp] = useState(params.waterTemp ?? '');
  const [grinderNotes, setGrinderNotes] = useState(params.grinderNotes ?? '');

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/tasting',
      params: {
        method: params.method,
        coffeeName,
        dose,
        water,
        brewTime,
        waterTemp,
        grinderNotes,
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
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Brew details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Anything to note?
        </Text>
        <Text style={[styles.sub, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
          Optional — add details from your brew before we look at the taste.
        </Text>

        {params.autoTime ? (
          <View style={[styles.autofill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="check-circle" size={14} color={colors.accent} />
            <Text style={[styles.autofillText, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
              Brew time auto-filled from timer: {params.autoTime}
            </Text>
          </View>
        ) : null}

        <FormField label="Coffee name or origin">
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
            placeholder="e.g. Ethiopian Yirgacheffe"
            placeholderTextColor={colors.mutedForeground}
            value={coffeeName}
            onChangeText={setCoffeeName}
          />
        </FormField>

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
              value={brewTime}
              onChangeText={setBrewTime}
              placeholder="3:00"
              placeholderTextColor={colors.mutedForeground}
            />
          </FormField>
          <FormField label="Water temp" style={{ flex: 1 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
              value={waterTemp}
              onChangeText={setWaterTemp}
              placeholder="93°C"
              placeholderTextColor={colors.mutedForeground}
            />
          </FormField>
        </View>

        <FormField label="Notes (optional)">
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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17 },
  scroll: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  headline: { fontSize: 26, lineHeight: 32 },
  sub: { fontSize: 15, lineHeight: 22, marginTop: -4 },
  autofill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  autofillText: { fontSize: 13, flex: 1 },
  input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12 },
  textarea: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, minHeight: 80 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  nextBtn: { borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { fontSize: 17 },
});
