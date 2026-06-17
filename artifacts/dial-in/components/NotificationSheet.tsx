import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

interface NotificationSheetProps {
  visible: boolean;
  onEnable: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export function NotificationSheet({ visible, onEnable, onSkip, onDismiss }: NotificationSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onDismiss={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <Feather name="bell" size={28} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Never miss a reset
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Get a nudge on the 1st of each month when your free dial-ins reset, and a gentle reminder to brew on Saturdays.
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cta, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
              onPress={onEnable}
            >
              <Feather name="bell" size={16} color={colors.cream} style={{ marginRight: 8 }} />
              <Text style={[styles.ctaText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                Turn on reminders
              </Text>
            </Pressable>

            <Pressable onPress={onSkip} style={styles.skip}>
              <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                Not now
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(42,26,14,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17 },
  skip: { paddingVertical: 8 },
  skipText: { fontSize: 14 },
});
