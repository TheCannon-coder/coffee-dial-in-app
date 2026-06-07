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

const CARD_ACCENTS: Record<string, { bg: string; border: string; accent: string; tagBg: string; tagText: string }> = {
  scale:   { bg: '#FFF8F0', border: '#F0D8B0', accent: '#8B6347', tagBg: '#8B6347', tagText: '#fff' },
  kettle:  { bg: '#F0F6FF', border: '#B8D0F0', accent: '#3A6A9A', tagBg: '#3A6A9A', tagText: '#fff' },
  grinder: { bg: '#F6F0FF', border: '#C8B8F0', accent: '#6A4A9A', tagBg: '#6A4A9A', tagText: '#fff' },
};

export default function GearRecommendationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ items?: string }>();
  const [dismissing, setDismissing] = useState(false);

  const items: GearItem[] = params.items ? JSON.parse(params.items) : [];

  async function handleDismiss() {
    setDismissing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await dismissGearRecommendations();
    router.push('/home');
  }

  function handleShop(url: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(url);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={handleDismiss} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Level up your kit
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Better tools,{'\n'}better advice.
        </Text>
        <Text style={[styles.sub, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
          Based on your recent brews, these tools would let us give you much more precise coaching.
        </Text>

        {items.map(item => {
          const theme = CARD_ACCENTS[item.id] ?? CARD_ACCENTS.scale;
          return (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}
            >
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={[styles.emojiCircle, { backgroundColor: '#fff' }]}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                    {item.name}
                  </Text>
                </View>
              </View>

              {/* Why */}
              <View style={[styles.whyBox, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
                <Text style={[styles.whyText, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
                  {item.why}
                </Text>
              </View>

              {/* Products */}
              {item.products.map(product => (
                <View
                  key={product.name}
                  style={[styles.productRow, { backgroundColor: '#fff', shadowColor: colors.espresso }]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.productNameRow}>
                      <Text style={[styles.productName, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                        {product.name}
                      </Text>
                      <View style={[styles.tag, { backgroundColor: theme.tagBg }]}>
                        <Text style={[styles.tagText, { color: theme.tagText, fontFamily: 'DMSans_500Medium' }]}>
                          {product.tag}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.productMeta}>
                      <Text style={[styles.price, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                        {product.price}
                      </Text>
                      <Text style={[styles.stars, { color: '#F5A623' }]}>{'★'.repeat(5)}</Text>
                      <Text style={[styles.reviews, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
                        {product.stars} ({product.reviewCount})
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.shopBtn,
                      { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => handleShop(product.affiliateUrl)}
                  >
                    <Text style={[styles.shopBtnText, { fontFamily: 'DMSans_500Medium' }]}>Shop</Text>
                    <Feather name="arrow-up-right" size={13} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })}

        <View style={[styles.disclaimer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="info" size={13} color={colors.textSoft} />
          <Text style={[styles.disclaimerText, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
            These are affiliate links. We earn a small commission at no extra cost to you — and only recommend gear we genuinely think will improve your brews.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleDismiss}
          disabled={dismissing}
        >
          <Text style={[styles.doneBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
            Maybe later
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
  topTitle: { fontSize: 17 },
  scroll: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  headline: { fontSize: 30, lineHeight: 36 },
  sub: { fontSize: 15, lineHeight: 22 },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: { fontSize: 24 },
  cardTitle: { fontSize: 18 },
  whyBox: {
    borderRadius: 12,
    padding: 12,
  },
  whyText: { fontSize: 14, lineHeight: 21 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  productNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  productName: { fontSize: 14 },
  tag: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 10 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 16 },
  stars: { fontSize: 10, letterSpacing: 1 },
  reviews: { fontSize: 11 },
  shopBtn: {
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  shopBtnText: { fontSize: 13, color: '#fff' },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-start',
  },
  disclaimerText: { fontSize: 12, lineHeight: 18, flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  doneBtn: { borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  doneBtnText: { fontSize: 17 },
});
