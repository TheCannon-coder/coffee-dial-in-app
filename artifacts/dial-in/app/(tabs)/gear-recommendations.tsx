import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { type GearItem, dismissGearRecommendations } from '@/lib/gear-tracker';

export default function GearRecommendationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ items?: string; cachedAt?: string }>();
  const [dismissing, setDismissing] = useState(false);

  const items: GearItem[] = params.items ? JSON.parse(params.items) : [];
  const cachedAt = params.cachedAt || null;

  function formatCachedAt(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.round(diffMs / 60_000);
    if (diffMins < 2) return 'Updated just now';
    if (diffMins < 60) return `Updated ${diffMins} minutes ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours === 1) return 'Updated 1 hour ago';
    return `Updated ${diffHours} hours ago`;
  }

  async function handleDismiss() {
    setDismissing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await dismissGearRecommendations();
    router.push('/home');
  }

  function handleShop(url: string, productName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={handleDismiss} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          What's limiting your advice
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
          We noticed some data you haven't been logging. Here's what it means for your coaching.
        </Text>

        {cachedAt && (
          <Text style={[styles.cacheNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            {formatCachedAt(cachedAt)}
          </Text>
        )}

        {items.map((item, index) => (
          <View key={item.id}>
            {index > 0 && (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            )}

            {/* Section heading */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionEmoji}>{item.emoji}</Text>
              <Text style={[styles.sectionTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                No {item.missingLabel}
              </Text>
            </View>

            {/* Coaching explanation */}
            <Text style={[styles.body, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
              {item.limitingAdvice}
            </Text>

            {/* Solution — written like a coach talking, product mention is natural */}
            <Text style={[styles.body, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
              {item.solutionText}
            </Text>

            {/* Quiet product link */}
            <Pressable
              style={({ pressed }) => [styles.productLink, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => handleShop(item.affiliateUrl, item.productName)}
            >
              <Text style={[styles.productLinkName, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
                {item.productName}
              </Text>
              <Text style={[styles.productLinkPrice, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
                {item.productPrice}
              </Text>
              <Feather name="arrow-up-right" size={14} color={colors.accent} />
            </Pressable>
          </View>
        ))}

        <Text style={[styles.affiliateNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Links above are affiliate links — we earn a small commission at no extra cost to you.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          onPress={handleDismiss}
          disabled={dismissing}
        >
          <Text style={[styles.doneBtnText, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
            Got it, back to home
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
  topTitle: { fontSize: 16 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  intro: { fontSize: 15, lineHeight: 22 },
  divider: { height: 1, marginVertical: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { fontSize: 19 },
  body: { fontSize: 15, lineHeight: 23 },
  productLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  productLinkName: { fontSize: 15 },
  productLinkPrice: { fontSize: 14 },
  affiliateNote: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  cacheNote: { fontSize: 12, lineHeight: 18, marginTop: -4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  doneBtn: {
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  doneBtnText: { fontSize: 16 },
});
