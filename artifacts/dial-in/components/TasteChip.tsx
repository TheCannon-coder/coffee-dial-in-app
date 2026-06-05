import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface TasteChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export function TasteChip({ label, selected, onToggle }: TasteChipProps) {
  const colors = useColors();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.espresso : colors.card,
          borderColor: selected ? colors.espresso : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: selected ? colors.cream : colors.espresso,
            fontFamily: 'DMSans_400Regular',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 100,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
  },
});
