import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { useColors } from '@/hooks/useColors';
import { createCheckout } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { useSubscription } from '@/lib/revenuecat';

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resetsOn?: string; isAnonymous?: string }>();
  const { email } = useUser();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isLoading } = useSubscription();

  const [loading, setLoading] = useState<'yearly' | 'monthly' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const resetsOn = params.resetsOn ?? '';
  const isAnon = params.isAnonymous === '1';

  let resetLabel = '';
  if (resetsOn) {
    try {
      const d = new Date(resetsOn);
      resetLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } catch {}
  }

  const currentOffering = offerings?.current;
  const monthlyPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly',
  );
  const yearlyPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === 'ANNUAL' || p.identifier === '$rc_annual',
  );

  const monthlyPrice = monthlyPkg?.product?.priceString ?? '$4.99';
  const yearlyPrice  = yearlyPkg?.product?.priceString  ?? '$44.99';

  async function handleIAP(plan: 'yearly' | 'monthly') {
    const pkg = plan === 'yearly' ? yearlyPkg : monthlyPkg;
    if (!pkg) {
      setErrorMsg('Products unavailable. Please try again shortly.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(plan);
    setErrorMsg('');
    try {
      await purchase(pkg);
      router.replace('/home');
    } catch (e: unknown) {
      const code = (e as { userCancelled?: boolean })?.userCancelled;
      if (!code) {
        setErrorMsg('Purchase failed. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleStripeCheckout(plan: 'yearly' | 'monthly') {
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
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function handleRestore() {
    setShowRestoreConfirm(false);
    try {
      await restore();
      router.replace('/home');
    } catch {
      setErrorMsg('Could not restore purchases. Please try again.');
    }
  }

  const isLoadingAny = loading !== null || isPurchasing || isRestoring;

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

        {isLoading ? (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.plans}>
            <Pressable
              style={({ pressed }) => [
                styles.planCard,
                { backgroundColor: colors.espresso, opacity: pressed || isLoadingAny ? 0.85 : 1 },
              ]}
              onPress={() => handleIAP('yearly')}
              disabled={isLoadingAny}
            >
              <View style={[styles.bestValue, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.bestValueText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                  Best value — save 25%
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>
                {yearlyPrice}
              </Text>
              <Text style={[styles.planPeriod, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>per year</Text>
              {loading === 'yearly' && (
                <ActivityIndicator color={colors.cream} size="small" style={{ marginTop: 8 }} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.planCard,
                { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5, opacity: pressed || isLoadingAny ? 0.85 : 1 },
              ]}
              onPress={() => handleIAP('monthly')}
              disabled={isLoadingAny}
            >
              <Text style={[styles.planPrice, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                {monthlyPrice}
              </Text>
              <Text style={[styles.planPeriod, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>per month</Text>
              {loading === 'monthly' && (
                <ActivityIndicator color={colors.espresso} size="small" style={{ marginTop: 8 }} />
              )}
            </Pressable>
          </View>
        )}

        {errorMsg ? (
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'DMSans_400Regular' }]}>
            {errorMsg}
          </Text>
        ) : null}

        {resetLabel ? (
          <Text style={[styles.resetText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Or wait until {resetLabel} — your free dial-ins reset then.
          </Text>
        ) : null}

        <Pressable onPress={() => router.push('/home')} style={styles.notNow}>
          <Text style={[styles.notNowText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>Not now</Text>
        </Pressable>

        <Pressable onPress={() => setShowRestoreConfirm(true)} style={styles.restoreBtn} disabled={isLoadingAny}>
          <Text style={[styles.restoreBtnText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            {isRestoring ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={showRestoreConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowRestoreConfirm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              Restore purchases?
            </Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              This will restore any previous Pro subscription linked to your Apple ID.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
                onPress={handleRestore}
              >
                <Text style={[styles.modalBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>Restore</Text>
              </Pressable>
              <Pressable onPress={() => setShowRestoreConfirm(false)} style={styles.modalCancel}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 300,
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
  restoreBtn: {
    paddingVertical: 8,
  },
  restoreBtnText: {
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42,26,14,0.45)',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalActions: {
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  modalBtn: {
    width: '100%',
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 16 },
  modalCancel: { paddingVertical: 8 },
  modalCancelText: { fontSize: 14 },
});
