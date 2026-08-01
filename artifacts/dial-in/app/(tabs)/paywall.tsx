import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Purchases from 'react-native-purchases';
import { useColors } from '@/hooks/useColors';
import { redeemPromoCode } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { useSubscription } from '@/lib/revenuecat';

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resetsOn?: string; isAnonymous?: string }>();
  const { email, ensureAnonId } = useUser();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isLoading, offeringsError, refetchOfferings } = useSubscription();

  const [loading, setLoading] = useState<'yearly' | 'monthly' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

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

  const productsReady = !isLoading && (!!monthlyPkg || !!yearlyPkg);
  const productsFailedToLoad = !isLoading && !monthlyPkg && !yearlyPkg;

  async function handleRetry() {
    setIsRetrying(true);
    setErrorMsg('');
    try {
      await refetchOfferings();
    } finally {
      setIsRetrying(false);
    }
  }

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

  async function handleRestore() {
    setShowRestoreConfirm(false);
    try {
      await restore();
      router.replace('/home');
    } catch {
      setErrorMsg('Could not restore purchases. Please try again.');
    }
  }

  function openPromoModal() {
    setPromoCode('');
    setPromoError('');
    setPromoSuccess('');
    setShowPromoModal(true);
  }

  async function handleRedeemPromo() {
    const trimmed = promoCode.trim();
    if (!trimmed) {
      setPromoError('Please enter a promo code.');
      return;
    }
    setPromoLoading(true);
    setPromoError('');
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const revenuecatId = customerInfo.originalAppUserId;
      const localAnonId = email ? undefined : await ensureAnonId();
      const result = await redeemPromoCode(trimmed, revenuecatId, { email: email ?? undefined, anonId: localAnonId });
      if (result.error) {
        setPromoError(result.error);
      } else {
        setPromoSuccess(result.message ?? 'Code applied! Your Pro access is now active.');
        await Purchases.invalidateCustomerInfoCache();
      }
    } catch {
      setPromoError('Something went wrong. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  }

  function handlePromoDone() {
    setShowPromoModal(false);
    if (promoSuccess) {
      router.replace('/home');
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

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 32, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="coffee" size={28} color={colors.accent} />
        </View>

        <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          {isAnon ? "You've used your free trial" : 'Monthly limit reached'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Upgrade for unlimited coaching sessions and never stop improving your brew.
        </Text>

        <View style={[styles.proLabel, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.proLabelText, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
            Coffee Brew Coach Pro
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginVertical: 32 }} />
        ) : productsFailedToLoad ? (
          <View style={styles.retryContainer}>
            <Text style={[styles.retryMessage, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              {offeringsError
                ? 'Could not load subscription options. Please check your connection and try again.'
                : 'Subscription options are temporarily unavailable. Please try again.'}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryBtn,
                { backgroundColor: colors.espresso, opacity: pressed || isRetrying ? 0.8 : 1 },
              ]}
              onPress={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <ActivityIndicator color={colors.cream} size="small" />
              ) : (
                <Text style={[styles.retryBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                  Try Again
                </Text>
              )}
            </Pressable>
          </View>
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
            Or wait until {resetLabel} — your free coaching sessions reset then.
          </Text>
        ) : null}

        <Pressable onPress={() => router.push('/home')} style={styles.notNow}>
          <Text style={[styles.notNowText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>Not now</Text>
        </Pressable>

        <Pressable onPress={openPromoModal} style={styles.promoBtn} disabled={isLoadingAny}>
          <Text style={[styles.promoBtnText, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
            Have a promo code?
          </Text>
        </Pressable>

        <Pressable onPress={() => setShowRestoreConfirm(true)} style={styles.restoreBtn} disabled={isLoadingAny}>
          <Text style={[styles.restoreBtnText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            {isRestoring ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>

        <Text style={[styles.legalNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Coffee Brew Coach Pro subscription auto-renews monthly ({monthlyPrice}/mo) or annually ({yearlyPrice}/yr) until cancelled. Cancel anytime in App Store Settings.
        </Text>

        <View style={styles.legalLinks}>
          <Pressable onPress={() => WebBrowser.openBrowserAsync('https://coffeebrew.coach/api/privacy')}>
            <Text style={[styles.legalLink, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>Privacy Policy</Text>
          </Pressable>
          <Text style={[styles.legalSep, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>·</Text>
          <Pressable onPress={() => WebBrowser.openBrowserAsync('https://coffeebrew.coach/api/terms')}>
            <Text style={[styles.legalLink, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>Terms of Use</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Restore purchases confirmation modal */}
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

      {/* Promo code modal */}
      <Modal
        visible={showPromoModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !promoLoading && setShowPromoModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {promoSuccess ? (
              <>
                <View style={[styles.promoSuccessIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="check-circle" size={28} color={colors.accent} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  Code applied!
                </Text>
                <Text style={[styles.modalBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  {promoSuccess}
                </Text>
                <View style={styles.modalActions}>
                  <Pressable
                    style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
                    onPress={handlePromoDone}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                      Start brewing
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  Promo code
                </Text>
                <Text style={[styles.modalBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Enter your code below to unlock Pro access.
                </Text>
                <TextInput
                  style={[
                    styles.promoInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: promoError ? colors.destructive : colors.border,
                      color: colors.espresso,
                      fontFamily: 'DMSans_500Medium',
                    },
                  ]}
                  value={promoCode}
                  onChangeText={(t) => { setPromoCode(t); setPromoError(''); }}
                  placeholder="e.g. PH1FREE"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleRedeemPromo}
                  editable={!promoLoading}
                />
                {promoError ? (
                  <Text style={[styles.promoErrorText, { color: colors.destructive, fontFamily: 'DMSans_400Regular' }]}>
                    {promoError}
                  </Text>
                ) : null}
                <View style={styles.modalActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalBtn,
                      { backgroundColor: colors.espresso, opacity: pressed || promoLoading ? 0.8 : 1 },
                    ]}
                    onPress={handleRedeemPromo}
                    disabled={promoLoading}
                  >
                    {promoLoading ? (
                      <ActivityIndicator color={colors.cream} size="small" />
                    ) : (
                      <Text style={[styles.modalBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                        Redeem
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => setShowPromoModal(false)}
                    style={styles.modalCancel}
                    disabled={promoLoading}
                  >
                    <Text style={[styles.modalCancelText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
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
  retryContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  retryMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    borderRadius: 100,
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 140,
    alignItems: 'center',
  },
  retryBtnText: { fontSize: 15 },
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
  promoBtn: {
    paddingVertical: 8,
  },
  promoBtnText: {
    fontSize: 14,
  },
  restoreBtn: {
    paddingVertical: 8,
  },
  restoreBtnText: {
    fontSize: 13,
  },
  proLabel: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  proLabelText: {
    fontSize: 13,
  },
  legalNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 300,
    marginTop: 4,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legalLink: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontSize: 11,
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
    minHeight: 48,
    justifyContent: 'center',
  },
  modalBtnText: { fontSize: 16 },
  modalCancel: { paddingVertical: 8 },
  modalCancelText: { fontSize: 14 },
  promoInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
  },
  promoErrorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  promoSuccessIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
