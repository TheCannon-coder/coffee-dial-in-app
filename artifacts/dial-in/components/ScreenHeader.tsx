import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  disabled?: boolean;
  rightSlot?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, disabled, rightSlot }: ScreenHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        style={styles.backBtn}
        disabled={disabled}
      >
        <Feather name="arrow-left" size={22} color={colors.espresso} />
      </Pressable>
      <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
        {title}
      </Text>
      <View style={styles.right}>{rightSlot ?? null}</View>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17 },
  right: { width: 40, alignItems: 'flex-end' },
});
