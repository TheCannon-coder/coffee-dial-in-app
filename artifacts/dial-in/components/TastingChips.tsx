import React from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { TasteChip } from '@/components/TasteChip';

const CHIP_GROUPS = [
  {
    label: 'Tasted good',
    chips: ['Sweet', 'Bright', 'Juicy', 'Balanced', 'Clean', 'Smooth', 'Silky', 'Syrupy', 'Crisp', 'Tangy'],
  },
  {
    label: 'Too sharp or sour',
    chips: ['Sour', 'Sharp', 'Salty', 'Metallic', 'Tart', 'Green / grassy', 'Short finish', 'No sweetness'],
  },
  {
    label: 'Too bitter or harsh',
    chips: ['Bitter', 'Harsh', 'Dry', 'Astringent', 'Flat', 'Burnt', 'Chalky', 'Lingers too long'],
  },
  {
    label: 'Strength & body',
    chips: ['Watery', 'Weak', 'Thin', 'Tea-like', 'Heavy', 'Thick', 'Muddy', 'Sludgy'],
  },
  {
    label: 'Flavour character',
    chips: ['Fruity', 'Floral', 'Chocolate', 'Nutty', 'Caramel', 'Honey', 'Tropical', 'Funky', 'Winey', 'Earthy', 'Spicy'],
  },
];

interface TastingChipsProps {
  selected: Set<string>;
  onToggle: (chip: string) => void;
  freeText: string;
  onFreeTextChange: (text: string) => void;
  brewComparison: 'better' | 'same' | 'worse' | null;
  onBrewComparisonChange: (val: 'better' | 'same' | 'worse' | null) => void;
  showComparison: boolean;
}

export function TastingChips({
  selected,
  onToggle,
  freeText,
  onFreeTextChange,
  brewComparison,
  onBrewComparisonChange,
  showComparison,
}: TastingChipsProps) {
  const colors = useColors();

  return (
    <>
      {CHIP_GROUPS.map(group => (
        <View key={group.label} style={styles.chipGroup}>
          <Text style={[styles.groupLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            {group.label}
          </Text>
          <View style={styles.chips}>
            {group.chips.map(chip => (
              <TasteChip
                key={chip}
                label={chip}
                selected={selected.has(chip)}
                onToggle={() => onToggle(chip)}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.freeTextGroup}>
        <Text style={[styles.groupLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Anything else you noticed?
        </Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
          placeholder="e.g. looked really dark, smelled smoky, felt rough on my tongue..."
          placeholderTextColor={colors.mutedForeground}
          value={freeText}
          onChangeText={onFreeTextChange}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {showComparison && (
        <View style={styles.comparisonGroup}>
          <Text style={[styles.comparisonLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            The most important question: was this brew better or worse than the previous?
          </Text>
          <View style={styles.comparisonButtons}>
            {(['worse', 'same', 'better'] as const).map((option) => {
              const labels = { worse: '👎 Worse', same: '→ Same', better: '👍 Better' };
              const isSelected = brewComparison === option;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.comparisonBtn,
                    {
                      backgroundColor: isSelected ? colors.espresso : colors.card,
                      borderColor: isSelected ? colors.espresso : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onBrewComparisonChange(brewComparison === option ? null : option);
                  }}
                >
                  <Text style={[styles.comparisonBtnText, { color: isSelected ? colors.cream : colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                    {labels[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chipGroup: { gap: 10 },
  groupLabel: { fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  freeTextGroup: { gap: 10 },
  textarea: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    minHeight: 80,
  },
  comparisonGroup: { gap: 12, paddingTop: 4 },
  comparisonLabel: { fontSize: 16, lineHeight: 22 },
  comparisonButtons: { flexDirection: 'row', gap: 10 },
  comparisonBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
  },
  comparisonBtnText: { fontSize: 14 },
});
