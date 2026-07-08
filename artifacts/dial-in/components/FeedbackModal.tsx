import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface FeedbackModalProps {
  visible: boolean;
  onFeedback: (helpful: boolean) => void;
}

export function FeedbackModal({ visible, onFeedback }: FeedbackModalProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 180,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  function handlePress(helpful: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFeedback(helpful);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />

          <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Better than your last brew?
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Compare this cup to the previous one.
          </Text>

          <View style={styles.btnRow}>
            <Pressable
              style={({ pressed }) => [
                styles.feedbackBtn,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handlePress(false)}
            >
              <Text style={styles.emoji}>😕</Text>
              <Text style={[styles.btnLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium' }]}>
                Same or worse
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.feedbackBtn,
                { backgroundColor: colors.espresso, borderColor: colors.espresso, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handlePress(true)}
            >
              <Text style={styles.emoji}>☕️</Text>
              <Text style={[styles.btnLabel, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                Yes, better!
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4C4B0',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  feedbackBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 28,
  },
  btnLabel: {
    fontSize: 15,
  },
});
