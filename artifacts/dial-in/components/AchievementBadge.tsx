import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Badge } from '@/lib/achievements';

interface AchievementBadgeProps {
  badge: Badge;
  earned?: boolean;
}

export function AchievementBadge({ badge, earned = true }: AchievementBadgeProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: earned ? colors.card : colors.secondary,
          borderColor: earned ? colors.border : 'transparent',
          opacity: earned ? 1 : 0.4,
        },
      ]}
    >
      <Text style={styles.emoji}>{badge.emoji}</Text>
      <Text
        style={[
          styles.title,
          { color: colors.espresso, fontFamily: 'DMSans_500Medium' },
        ]}
        numberOfLines={1}
      >
        {badge.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 6,
    width: 90,
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 11,
    textAlign: 'center',
  },
});
