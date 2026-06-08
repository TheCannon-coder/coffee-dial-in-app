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
import { type Badge } from '@/lib/achievements';

type Props = {
  badges: Badge[];
  /** Index of the currently displayed badge (controlled by parent) */
  index: number;
  onNext: () => void;
  onClose: () => void;
};

// 6 spark directions evenly distributed
const SPARK_ANGLES = [0, 60, 120, 180, 240, 300].map(deg => (deg * Math.PI) / 180);
const SPARK_RADIUS = 58;
const SPARK_COLORS = ['#C8A97A', '#E8C88A', '#FAF7F2', '#A89060', '#D4B080', '#FAF7F2'];

export function BadgeEarnedModal({ badges, index, onNext, onClose }: Props) {
  const colors = useColors();
  const badge = badges[index];
  const isLast = index === badges.length - 1;

  // ── Animated values ───────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const emojiScale     = useRef(new Animated.Value(0.2)).current;
  const haloScale      = useRef(new Animated.Value(0.6)).current;
  const haloOpacity    = useRef(new Animated.Value(0)).current;
  const sparkAnims     = useRef(SPARK_ANGLES.map(() => new Animated.Value(0))).current;

  function runEntrance() {
    // Reset
    overlayOpacity.setValue(0);
    cardTranslateY.setValue(50);
    emojiScale.setValue(0.2);
    haloScale.setValue(0.6);
    haloOpacity.setValue(0);
    sparkAnims.forEach(a => a.setValue(0));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      // Overlay fade in
      Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      // Card spring up
      Animated.spring(cardTranslateY, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      // Emoji bounce in
      Animated.spring(emojiScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }),
      // Halo pulse out + fade
      Animated.sequence([
        Animated.timing(haloOpacity, { toValue: 0.6, duration: 100, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(haloScale,   { toValue: 2.8, duration: 600, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0,   duration: 600, useNativeDriver: true }),
        ]),
      ]),
      // Sparks burst outward
      Animated.stagger(
        40,
        sparkAnims.map(a =>
          Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: true })
        )
      ),
    ]).start();
  }

  useEffect(() => {
    if (badges.length > 0) runEntrance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, badges.length]);

  if (!badge) return null;

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.espresso, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
          {/* Badge count indicator */}
          {badges.length > 1 && (
            <Text style={[styles.counter, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
              {index + 1} of {badges.length}
            </Text>
          )}

          <Text style={[styles.unlocked, { color: '#A89080', fontFamily: 'DMSans_500Medium' }]}>
            BADGE UNLOCKED
          </Text>

          {/* Emoji with halo + sparks */}
          <View style={styles.emojiContainer}>
            {/* Halo ring */}
            <Animated.View
              style={[
                styles.halo,
                { transform: [{ scale: haloScale }], opacity: haloOpacity },
              ]}
            />

            {/* Sparks */}
            {SPARK_ANGLES.map((angle, i) => {
              const tx = sparkAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.cos(angle) * SPARK_RADIUS],
              });
              const ty = sparkAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.sin(angle) * SPARK_RADIUS],
              });
              const opacity = sparkAnims[i].interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
              });
              const scale = sparkAnims[i].interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 1.2, 0.4],
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.spark,
                    {
                      backgroundColor: SPARK_COLORS[i],
                      opacity,
                      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
                    },
                  ]}
                />
              );
            })}

            {/* Emoji */}
            <Animated.Text
              style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}
            >
              {badge.emoji}
            </Animated.Text>
          </View>

          {/* Badge info */}
          <Text style={[styles.title, { color: '#FAF7F2', fontFamily: 'Fraunces_500Medium' }]}>
            {badge.title}
          </Text>
          <Text style={[styles.celebration, { color: '#C8A97A', fontFamily: 'DMSans_400Regular' }]}>
            {badge.celebration}
          </Text>
          <Text style={[styles.description, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
            {badge.description}
          </Text>

          {/* Action button */}
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: '#FAF7F2', opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              isLast ? onClose() : onNext();
            }}
          >
            <Text style={[styles.btnText, { color: '#2C1A0E', fontFamily: 'DMSans_500Medium' }]}>
              {isLast ? 'Awesome!' : `Next →`}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 10, 5, 0.78)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 10,
  },
  counter: {
    fontSize: 12,
    position: 'absolute',
    top: 18,
    right: 22,
  },
  unlocked: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  emojiContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  halo: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C8A97A',
  },
  spark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
  },
  celebration: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  btn: {
    borderRadius: 100,
    paddingVertical: 15,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  btnText: { fontSize: 17 },
});
