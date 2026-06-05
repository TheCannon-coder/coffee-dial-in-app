import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { createCheckout } from '@/lib/api';
import { useUser } from '@/context/UserContext';

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resetsOn?: string; isAnonymous?: string }>();
  const { email } = useUser();
  const [loading, setLoading] = useState<'yearly' | 'monthly' | null>(null);

  const resetsOn = params.resetsOn ?? '';
  const isAnon = params.isAnonymous === '1';

  let resetLabel = '';
  if (resetsOn) {
    try {
      const d = new Date(resetsOn);
      resetLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } catch {}
  }

  async function handleUpgrade(plan: 'yearly' | 'monthly') {
    if (!email) {
      router.push('/onboarding');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(plan);
    try {
      const { url } = await createCheckout(email, plan);
      if (url) WebBrowser.openBrowserAsync(url);
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>Upgrade</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="coffee" size={28} color={colors.accent} />
        </View>

        <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          {isAnon ? "You've used your free trial" : 'Monthly limit reached'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Upgrade for unlimited dial-ins and never stop improving your brew.
        </Text>

        <View style={styles.plans}>
          <Pressable
            style={({ pressed }) => [
              styles.planCard,
              styles.planCardFeatured,
              { backgroundColor: colors.espresso, opacity: pressed || loading === 'yearly' ? 0.85 : 1 },
            ]}
            onPress={() => handleUpgrade('yearly')}
            disabled={!!loading}
          >
            <View style={[styles.bestValue, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.bestValueText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                Best value — save 25%
              </Text>
            </View>
            <Text style={[styles.planPrice, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>$44.99</Text>
            <Text style={[styles.planPeriod, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>per year</Text>
            {loading === 'yearly' ? (
              <ActivityIndicator color={colors.cream} size="small" style={{ marginTop: 8 }} />
            ) : null}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.planCard,
              { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5, opacity: pressed || loading === 'monthly' ? 0.85 : 1 },
            ]}
            onPress={() => handleUpgrade('monthly')}
            disabled={!!loading}
          >
            <Text style={[styles.planPrice, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>$4.99</Text>
            <Text style={[styles.planPeriod, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>per month</Text>
            {loading === 'monthly' ? (
              <ActivityIndicator color={colors.espresso} size="small" style={{ marginTop: 8 }} />
            ) : null}
          </Pressable>
        </View>

        {resetLabel ? (
          <Text style={[styles.resetText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Or wait until {resetLabel} — your free dial-ins reset then.
          </Text>
        ) : null}

        <Pressable onPress={() => router.push('/home')} style={styles.notNow}>
          <Text style={[styles.notNowText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>Not now</Text>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 17 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  plans: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  planCardFeatured: {},
  bestValue: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  bestValueText: { fontSize: 12 },
  planPrice: { fontSize: 32 },
  planPeriod: { fontSize: 15 },
  resetText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  notNow: {
    paddingVertical: 12,
  },
  notNowText: {
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
