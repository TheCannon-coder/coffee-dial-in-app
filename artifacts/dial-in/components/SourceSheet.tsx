import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export const ACQUISITION_SOURCES = [
  'A friend',
  'App Store',
  'Reddit',
  'Instagram / TikTok',
  'The Cannon café',
  'Web search',
  'Other',
] as const;

interface SourceSheetProps {
  visible: boolean;
  onPick: (source: string) => void;
  onSkip: () => void;
}

/** One-tap "how'd you hear about us?" — the only acquisition attribution
 *  the app has, so it earns its single onboarding beat. */
export function SourceSheet({ visible, onPick, onSkip }: SourceSheetProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <Feather name="compass" size={28} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            One quick one — how'd you find us?
          </Text>

          <View style={styles.chips}>
            {ACQUISITION_SOURCES.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPick(s);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onSkip} style={styles.skip}>
            <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Skip
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(42,26,14,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: { width: 36, height: 4, borderRadius: 2, marginBottom: 20 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: { fontSize: 14 },
  skip: { paddingVertical: 14, marginTop: 6 },
  skipText: { fontSize: 14 },
});
