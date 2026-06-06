import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useApplePay, type ApplePayError } from '@/lib/use-apple-pay';
import { useColors } from '@/hooks/useColors';
import { createCheckout, createPaymentIntent } from '@/lib/api';
import { useUser } from '@/context/UserContext';

const PLANS = {
  yearly: { label: '$44.99 / year', amount: 4499, currency: 'USD' },
  monthly: { label: '$4.99 / month', amount: 499, currency: 'USD' },
};

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resetsOn?: string; isAnonymous?: string }>();
  const { email } = useUser();
  const { isApplePaySupported, presentApplePay, confirmApplePayPayment } = useApplePay();

  const [loading, setLoading] = useState<'yearly' | 'monthly' | null>(null);
  const [applePayLoading, setApplePayLoading] = useState<'yearly' | 'monthly' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const resetsOn = params.resetsOn ?? '';
  const isAnon = params.isAnonymous === '1';

  let resetLabel = '';
  if (resetsOn) {
    try {
      const d = new Date(resetsOn);
      resetLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } catch {}
  }

  async function handleApplePay(plan: 'yearly' | 'monthly') {
    if (!email) {
      router.push('/onboarding');
      return;
    }
    setErrorMsg('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setApplePayLoading(plan);
    try {
      const { error: sheetError } = await presentApplePay({
        cartItems: [
          {
            label: plan === 'yearly' ? 'Coffee Brew Coach — Annual' : 'Coffee Brew Coach — Monthly',
            amount: plan === 'yearly' ? '44.99' : '4.99',
            paymentType: 'Immediate',
          },
        ],
        country: 'US',
        currency: PLANS[plan].currency,
        requiredBillingContactFields: ['emailAddress'],
      });

      if (sheetError) {
        if ((sheetError as ApplePayError).code !== 'Canceled') {
          setErrorMsg('Apple Pay could not be completed. Please try another payment method.');
        }
        return;
      }

      const { clientSecret } = await createPaymentIntent(email, plan);
      const { error: confirmError } = await confirmApplePayPayment(clientSecret);

      if (confirmError) {
        setErrorMsg('Payment failed. Please try again or use another method.');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/home');
      }
    } catch {
      setErrorMsg('Something went wrong. Try the web checkout below.');
    } finally {
      setApplePayLoading(null);
    }
  }

  async function handleWebCheckout(plan: 'yearly' | 'monthly') {
    if (!email) {
      router.push('/onboarding');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const showApplePay = Platform.OS === 'ios' && isApplePaySupported;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>Upgrade</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.content, { paddingTop: 32, paddingBottom: insets.bottom + 24 }]}>
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
              { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => showApplePay ? handleApplePay('yearly') : handleWebCheckout('yearly')}
            disabled={!!(loading || applePayLoading)}
          >
            <View style={[styles.bestValue, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.bestValueText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                Best value — save 25%
              </Text>
            </View>
            <Text style={[styles.planPrice, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>$44.99</Text>
            <Text style={[styles.planPeriod, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>per year</Text>
            {(applePayLoading === 'yearly' || loading === 'yearly') ? (
              <ActivityIndicator color={colors.cream} size="small" style={{ marginTop: 8 }} />
            ) : showApplePay ? (
              <View style={styles.applePayBadge}>
                <Text style={styles.applePayBadgeText}> Pay</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.planCard,
              { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => showApplePay ? handleApplePay('monthly') : handleWebCheckout('monthly')}
            disabled={!!(loading || applePayLoading)}
          >
            <Text style={[styles.planPrice, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>$4.99</Text>
            <Text style={[styles.planPeriod, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>per month</Text>
            {(applePayLoading === 'monthly' || loading === 'monthly') ? (
              <ActivityIndicator color={colors.espresso} size="small" style={{ marginTop: 8 }} />
            ) : showApplePay ? (
              <View style={[styles.applePayBadge, { backgroundColor: colors.espresso + '18' }]}>
                <Text style={[styles.applePayBadgeText, { color: colors.espresso }]}> Pay</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {errorMsg ? (
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'DMSans_400Regular' }]}>
            {errorMsg}
          </Text>
        ) : null}

        {showApplePay && (
          <View style={styles.altRow}>
            <View style={[styles.altDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.altLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              or pay via web
            </Text>
            <View style={[styles.altDivider, { backgroundColor: colors.border }]} />
          </View>
        )}

        {showApplePay && (
          <View style={styles.webLinks}>
            <Pressable onPress={() => handleWebCheckout('yearly')} disabled={!!(loading || applePayLoading)}>
              <Text style={[styles.webLinkText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                $44.99/yr via browser
              </Text>
            </Pressable>
            <Text style={[{ color: colors.border, fontFamily: 'DMSans_400Regular' }]}>·</Text>
            <Pressable onPress={() => handleWebCheckout('monthly')} disabled={!!(loading || applePayLoading)}>
              <Text style={[styles.webLinkText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                $4.99/mo via browser
              </Text>
            </Pressable>
          </View>
        )}

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
    gap: 14,
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
    marginTop: 4,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  bestValue: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  bestValueText: { fontSize: 12 },
  planPrice: { fontSize: 32 },
  planPeriod: { fontSize: 15 },
  applePayBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  applePayBadgeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 300,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  altDivider: {
    flex: 1,
    height: 1,
  },
  altLabel: {
    fontSize: 12,
  },
  webLinks: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: -4,
  },
  webLinkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
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
