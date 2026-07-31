import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import {
  getAffiliateStats,
  getAffiliateMetrics,
  getConnectStatus,
  startConnectOnboarding,
  joinAffiliate,
  updateReferralCode,
  AffiliateStats,
  AffiliateMonth,
  ConnectStatusResult,
} from '@/lib/api';

// ── Calculator constants ─────────────────────────────────────────────────────
const CONV_SIGNUP = 0.25;
const CONV_PRO = 0.18;
const DEFAULT_RATE_CENTS = 200; // Platinum tier — shown in the marketing calculator

const AUDIENCE_PRESETS = [
  { label: '1K', value: 1_000 },
  { label: '5K', value: 5_000 },
  { label: '10K', value: 10_000 },
  { label: '25K', value: 25_000 },
  { label: '50K', value: 50_000 },
  { label: '100K', value: 100_000 },
  { label: '250K', value: 250_000 },
  { label: '500K', value: 500_000 },
  { label: '1M+', value: 1_000_000 },
];

function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 10_000) return `$${Math.round(dollars / 1000)}k`;
  if (dollars >= 1_000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(2)}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(n);
}

function formatMonth(key: string): string {
  const [year, month] = key.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AffiliateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, referralCode, setReferralCode } = useUser();

  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [months, setMonths] = useState<AffiliateMonth[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const [connectStatus, setConnectStatus] = useState<ConnectStatusResult | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const [editingCode, setEditingCode] = useState(false);
  const [editCodeValue, setEditCodeValue] = useState('');
  const [editCodeLoading, setEditCodeLoading] = useState(false);

  const [audienceIdx, setAudienceIdx] = useState(4);
  const [copied, setCopied] = useState(false);

  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCountry, setJoinCountry] = useState('US');
  const [joinPayoutEmail, setJoinPayoutEmail] = useState(email ?? '');
  const [joinFtcAccepted, setJoinFtcAccepted] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  const refreshConnectStatus = useCallback(async () => {
    if (!email) return;
    try {
      const s = await getConnectStatus(email);
      setConnectStatus(s);
    } catch {
      // silently ignore
    }
  }, [email]);

  const loadData = useCallback(async () => {
    if (!email) return;
    setLoadingStats(true);
    try {
      const [s, m] = await Promise.all([
        getAffiliateStats(email),
        getAffiliateMetrics(email),
      ]);
      setStats(s);
      setMonths(m.months ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoadingStats(false);
    }
    refreshConnectStatus();
  }, [email, refreshConnectStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnectOnboard = useCallback(async () => {
    if (!email) return;
    setConnectLoading(true);
    try {
      const result = await startConnectOnboarding(email);
      if (result.alreadyComplete) {
        setConnectStatus({ status: 'complete', payoutsEnabled: true });
        return;
      }
      if (result.url) {
        await WebBrowser.openBrowserAsync(result.url);
        await refreshConnectStatus();
      }
    } catch {
      // silently ignore
    } finally {
      setConnectLoading(false);
    }
  }, [email, refreshConnectStatus]);

  const handleJoinAffiliate = useCallback(async () => {
    if (!email) return;
    if (!joinFtcAccepted) {
      Alert.alert('FTC Disclosure Required', 'Please confirm you will disclose your affiliate relationship in all promotional content.');
      return;
    }
    if (!joinPayoutEmail.trim()) {
      Alert.alert('Payout Email Required', 'Enter the email address linked to your Stripe account.');
      return;
    }
    setJoinLoading(true);
    try {
      const result = await joinAffiliate({
        email,
        country: joinCountry,
        payoutEmail: joinPayoutEmail.trim(),
        ftcDisclosureAccepted: true,
      });
      if (result.error) {
        if (result.comingSoon) {
          Alert.alert('Coming Soon', 'Affiliate payouts are currently available for US and Canada residents. We\'ll expand to more countries soon.');
        } else {
          Alert.alert('Error', result.error);
        }
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowJoinForm(false);
      await loadData();
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  }, [email, joinCountry, joinPayoutEmail, joinFtcAccepted, loadData]);

  const rateCents = stats?.isAffiliate && stats.monthlyRateCents
    ? stats.monthlyRateCents
    : DEFAULT_RATE_CENTS;

  const scrollRef = useRef<ScrollView>(null);

  const audience = AUDIENCE_PRESETS[audienceIdx].value;
  const signups = Math.round(audience * CONV_SIGNUP);
  const pro = Math.round(signups * CONV_PRO);
  const monthlyEst = pro * rateCents;

  const referralLink = referralCode
    ? `https://www.coffeebrew.coach?ref=${referralCode}`
    : null;

  const handleCopy = useCallback(async () => {
    if (!referralLink) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    if (!referralLink) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // On iOS, Share.share appends `url` after `message` — including the URL in
    // both fields creates two link-preview cards in iMessage. Pass text-only in
    // `message` and the URL separately so the system produces one clean preview.
    Share.share(
      Platform.OS === 'ios'
        ? {
            message: "I've been using Coffee Brew Coach to perfect my espresso — try it free for a month with my link:",
            url: referralLink,
          }
        : {
            message: `I've been using Coffee Brew Coach to perfect my espresso — try it free for a month with my link: ${referralLink}`,
          }
    );
  }, [referralLink]);

  const hasActivity = months.some(m => m.newConversions > 0 || m.earningsCents > 0);

  const handleSaveCode = useCallback(async () => {
    if (!email || !editCodeValue.trim()) return;
    const newCode = editCodeValue.trim().toUpperCase();
    if (newCode === referralCode) { setEditingCode(false); return; }
    setEditCodeLoading(true);
    try {
      const result = await updateReferralCode(email, newCode);
      if (result.error) {
        Alert.alert('Could Not Update', result.error);
        return;
      }
      setReferralCode(result.code ?? newCode);
      setEditingCode(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setEditCodeLoading(false);
    }
  }, [email, editCodeValue, referralCode, setReferralCode]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <Pressable
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="arrow-left" size={22} color={colors.espresso} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Refer {'&'} Earn
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Share Coffee Brew Coach and earn cash commissions for every Pro subscriber you refer.
        </Text>

        {/* ── Status banner: answers "am I an affiliate?" at a glance ── */}
        {!loadingStats && (
          stats?.isAffiliate ? (
            <View style={[styles.statusBanner, { backgroundColor: colors.card, borderColor: colors.accent }]}>
              <Feather name="check-circle" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusTitle, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                  You're an affiliate — {(stats.tier ?? 'standard').charAt(0).toUpperCase() + (stats.tier ?? 'standard').slice(1)} tier
                </Text>
                <Text style={[styles.statusSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Earning {fmtMoney(rateCents)}/active subscriber/month — stats below
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.statusBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="user-plus" size={18} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusTitle, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                  You're not an affiliate yet
                </Text>
                <Text style={[styles.statusSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Apply in two minutes to earn cash for every Pro subscriber you refer
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowJoinForm(true);
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
                }}
                style={({ pressed }) => [styles.statusCta, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.statusCtaText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>Apply</Text>
              </Pressable>
            </View>
          )
        )}

        {/* ── Referral code card ── */}
        {referralCode && (
          <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {editingCode ? (
              <>
                <TextInput
                  style={[styles.codeEditInput, { color: colors.espresso, borderColor: colors.border, fontFamily: 'DMSans_500Medium' }]}
                  value={editCodeValue}
                  onChangeText={v => setEditCodeValue(v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  autoCapitalize="characters"
                  autoFocus
                  maxLength={20}
                  placeholder="YOUR-CODE"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.editCodeNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Letters, numbers, hyphens. Can only change if your code hasn't been used yet.
                </Text>
                <View style={styles.editCodeActions}>
                  <Pressable
                    style={({ pressed }) => [styles.editCodeSaveBtn, { backgroundColor: colors.espresso, opacity: pressed || editCodeLoading ? 0.7 : 1 }]}
                    onPress={handleSaveCode}
                    disabled={editCodeLoading}
                  >
                    {editCodeLoading
                      ? <ActivityIndicator size="small" color={colors.cream} />
                      : <Text style={[styles.editCodeBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>Save</Text>}
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.editCodeCancelBtn, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                    onPress={() => { setEditingCode(false); setEditCodeValue(''); }}
                  >
                    <Text style={[styles.editCodeBtnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.codeDisplayRow}>
                  <Text style={[styles.codeBig, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                    {referralCode}
                  </Text>
                  <Pressable
                    hitSlop={12}
                    onPress={() => { setEditingCode(true); setEditCodeValue(referralCode); }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                <Text style={[styles.codeUrl, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]} numberOfLines={1}>
                  coffeebrew.coach?ref={referralCode}
                </Text>
                <View style={styles.linkActions}>
                  <Pressable
                    style={({ pressed }) => [styles.linkBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
                    onPress={handleCopy}
                  >
                    <Feather name={copied ? 'check' : 'copy'} size={13} color={colors.cream} />
                    <Text style={[styles.linkBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                      {copied ? 'Copied' : 'Copy link'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.linkBtn, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}
                    onPress={handleShare}
                  >
                    <Feather name="share-2" size={13} color={colors.espresso} />
                    <Text style={[styles.linkBtnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                      Share
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Affiliate stats / join ── */}
        {loadingStats ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        ) : (
          <>
            {/* ── Affiliate stats (if enrolled) ── */}
            {stats?.isAffiliate ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  Your affiliate stats
                </Text>
                <View style={styles.statsGrid}>
                  <StatCard label="Active subs" value={String(stats.activeConversions ?? 0)} colors={colors} />
                  <StatCard label="Est. monthly" value={fmtMoney(stats.estimatedMonthlyEarningsCents ?? 0)} colors={colors} highlight />
                  <StatCard label="Total referrals" value={String(stats.totalConversions ?? 0)} colors={colors} />
                  <StatCard label="Total earned" value={fmtMoney(stats.totalPaidCents ?? 0)} colors={colors} />
                </View>

                {(stats.pendingCents ?? 0) > 0 && (
                  <Text style={[styles.pendingNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                    {fmtMoney(stats.pendingCents!)} pending in next payout
                  </Text>
                )}

                {/* Monthly breakdown */}
                <Text style={[styles.sectionLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  Month by month
                </Text>
                <View style={[styles.monthTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {months.map((m, i) => (
                    <View
                      key={m.month}
                      style={[
                        styles.monthRow,
                        { borderTopColor: colors.border },
                        i === 0 && { borderTopWidth: 0 },
                      ]}
                    >
                      <Text style={[styles.monthName, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
                        {formatMonth(m.month)}
                      </Text>
                      <View style={styles.monthRight}>
                        <Text style={[styles.monthConv, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                          {m.newConversions > 0 ? `+${m.newConversions} referral${m.newConversions !== 1 ? 's' : ''}` : '—'}
                        </Text>
                        <Text style={[
                          styles.monthEarnings,
                          { fontFamily: 'DMSans_500Medium', color: m.earningsCents > 0 ? colors.espresso : colors.mutedForeground }
                        ]}>
                          {m.earningsCents > 0 ? fmtMoney(m.earningsCents) : '—'}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {!hasActivity && (
                    <View style={[styles.monthRow, { borderTopWidth: 0 }]}>
                      <Text style={[styles.emptyNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                        No activity yet — share your link to get started.
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.rateNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Your rate: {fmtMoney(rateCents)}/active subscriber/month
                </Text>

                {/* Payout setup */}
                <PayoutSetupCard
                  connectStatus={connectStatus}
                  loading={connectLoading}
                  onPress={handleConnectOnboard}
                  colors={colors}
                />

                {/* How payouts work link */}
                <Pressable
                  style={({ pressed }) => [styles.payoutsLink, { opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => router.push('/affiliate-payouts')}
                >
                  <Feather name="info" size={14} color={colors.accent} />
                  <Text style={[styles.payoutsLinkText, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
                    How payouts work
                  </Text>
                  <Feather name="chevron-right" size={14} color={colors.accent} />
                </Pressable>
              </>
            ) : (
              /* ── Affiliate join section (not yet enrolled) ── */
              <>
                <Text style={[styles.sectionLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  Earn cash commissions
                </Text>

                {!showJoinForm ? (
                  <View style={[styles.joinCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.joinBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                      Join the affiliate program to earn a monthly cash commission for every Pro subscriber you bring in.
                    </Text>

                    <View style={styles.joinFeatures}>
                      <JoinFeature icon="dollar-sign" text="Monthly cash payouts via Stripe" colors={colors} />
                      <JoinFeature icon="lock" text="Your rate locks in at signup — never retroactively reduced" colors={colors} />
                      <JoinFeature icon="trending-up" text="Silver, Gold, and Platinum tiers with higher rates" colors={colors} />
                      <JoinFeature icon="globe" text="US and Canada only (more countries coming)" colors={colors} />
                    </View>

                    <Pressable
                      style={({ pressed }) => [styles.joinBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
                      onPress={() => setShowJoinForm(true)}
                    >
                      <Text style={[styles.joinBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                        Join the affiliate program
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.payoutsLinkInCard, { opacity: pressed ? 0.6 : 1 }]}
                      onPress={() => router.push('/affiliate-payouts')}
                    >
                      <Feather name="info" size={13} color={colors.accent} />
                      <Text style={[styles.payoutsLinkText, { color: colors.accent, fontFamily: 'DMSans_400Regular' }]}>
                        How payouts work
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[styles.joinForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.joinFormTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                      Join affiliate program
                    </Text>

                    <Text style={[styles.fieldLabel, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                      Country
                    </Text>
                    <View style={styles.countryRow}>
                      {['US', 'CA'].map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setJoinCountry(c)}
                          style={[
                            styles.countryPill,
                            joinCountry === c
                              ? { backgroundColor: colors.espresso }
                              : { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 },
                          ]}
                        >
                          <Text style={[
                            styles.countryPillText,
                            { fontFamily: 'DMSans_500Medium', color: joinCountry === c ? colors.cream : colors.espresso },
                          ]}>
                            {c === 'US' ? '🇺🇸 United States' : '🇨🇦 Canada'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={[styles.fieldLabel, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                      Payout email (Stripe account)
                    </Text>
                    <TextInput
                      style={[styles.input, { color: colors.espresso, borderColor: colors.border, fontFamily: 'DMSans_400Regular' }]}
                      value={joinPayoutEmail}
                      onChangeText={setJoinPayoutEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <Pressable
                      style={styles.ftcRow}
                      onPress={() => setJoinFtcAccepted((v) => !v)}
                    >
                      <View style={[
                        styles.checkbox,
                        {
                          backgroundColor: joinFtcAccepted ? colors.espresso : 'transparent',
                          borderColor: joinFtcAccepted ? colors.espresso : colors.border,
                        },
                      ]}>
                        {joinFtcAccepted && <Feather name="check" size={11} color={colors.cream} />}
                      </View>
                      <Text style={[styles.ftcText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                        I agree to clearly disclose my affiliate relationship whenever I promote Coffee Brew Coach (FTC requirement).
                      </Text>
                    </Pressable>

                    <View style={styles.joinFormActions}>
                      <Pressable
                        style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                        onPress={() => setShowJoinForm(false)}
                      >
                        <Text style={[styles.cancelBtnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.submitBtn,
                          { backgroundColor: colors.espresso, opacity: pressed || joinLoading ? 0.7 : 1 },
                        ]}
                        onPress={handleJoinAffiliate}
                        disabled={joinLoading}
                      >
                        {joinLoading ? (
                          <ActivityIndicator color={colors.cream} size="small" />
                        ) : (
                          <Text style={[styles.submitBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                            Enroll
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ── Earnings calculator ── */}
        <Text style={[styles.sectionLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Earnings calculator
        </Text>
        <Text style={[styles.calcSubtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Estimate what you'd earn based on your audience size.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {AUDIENCE_PRESETS.map((p, i) => {
            const active = i === audienceIdx;
            return (
              <Pressable
                key={p.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAudienceIdx(i);
                }}
                style={[
                  styles.pill,
                  active
                    ? { backgroundColor: colors.espresso }
                    : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Text style={[
                  styles.pillText,
                  { fontFamily: 'DMSans_500Medium', color: active ? colors.cream : colors.espresso }
                ]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.funnelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FunnelRow icon="radio" label="Audience reached" value={fmtNum(audience)} colors={colors} />
          <FunnelRow icon="user-plus" label={`Sign up (~${Math.round(CONV_SIGNUP * 100)}%)`} value={fmtNum(signups)} colors={colors} />
          <FunnelRow icon="star" label={`Go Pro (~${Math.round(CONV_PRO * 100)}% of signups)`} value={fmtNum(pro)} colors={colors} />
        </View>

        <View style={[styles.earningsCard, { backgroundColor: colors.espresso }]}>
          <Text style={[styles.earningsLabel, { color: 'rgba(250,247,242,0.5)', fontFamily: 'DMSans_400Regular' }]}>
            Estimated monthly earnings
          </Text>
          <Text style={[styles.earningsBig, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>
            {fmtMoney(monthlyEst)}
          </Text>
          <Text style={[styles.earningsYearly, { color: 'rgba(250,247,242,0.5)', fontFamily: 'DMSans_400Regular' }]}>
            {fmtMoney(monthlyEst * 12)} per year
          </Text>
        </View>

        <Text style={[styles.finePrint, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Estimates based on 25% signup rate · 18% Pro conversion.{' '}
          {stats?.isAffiliate
            ? `Your locked rate: ${fmtMoney(rateCents)}/sub/month.`
            : `Platinum tier rate shown ($2.00/sub/mo). Standard tier starts at $0.75.`}
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type Colors = ReturnType<typeof import('@/hooks/useColors').useColors>;

function StatCard({ label, value, colors, highlight }: {
  label: string;
  value: string;
  colors: Colors;
  highlight?: boolean;
}) {
  return (
    <View style={[
      styles.statCard,
      { backgroundColor: highlight ? colors.espresso : colors.card, borderColor: colors.border },
    ]}>
      <Text style={[
        styles.statValue,
        { fontFamily: 'Fraunces_500Medium', color: highlight ? colors.cream : colors.espresso }
      ]}>
        {value}
      </Text>
      <Text style={[
        styles.statLabel,
        { fontFamily: 'DMSans_400Regular', color: highlight ? 'rgba(250,247,242,0.55)' : colors.mutedForeground }
      ]}>
        {label}
      </Text>
    </View>
  );
}

function PayoutSetupCard({ connectStatus, loading, onPress, colors }: {
  connectStatus: ConnectStatusResult | null;
  loading: boolean;
  onPress: () => void;
  colors: Colors;
}) {
  const isComplete = connectStatus?.status === 'complete';

  return (
    <View style={[styles.payoutCard, { backgroundColor: colors.card, borderColor: isComplete ? colors.accent : colors.border }]}>
      <View style={styles.payoutHeader}>
        <Feather
          name={isComplete ? 'check-circle' : 'credit-card'}
          size={18}
          color={isComplete ? colors.accent : colors.espresso}
        />
        <Text style={[styles.payoutTitle, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
          Payout account
        </Text>
      </View>

      {isComplete ? (
        <Text style={[styles.payoutBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Your Stripe account is connected. We'll transfer your commissions directly to your bank.
        </Text>
      ) : (
        <>
          <Text style={[styles.payoutBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Connect a Stripe account to receive commission payouts directly to your bank.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.payoutBtn,
              { backgroundColor: colors.espresso, opacity: pressed || loading ? 0.7 : 1 },
            ]}
            onPress={onPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.cream} size="small" />
            ) : (
              <>
                <Feather name="external-link" size={14} color={colors.cream} />
                <Text style={[styles.payoutBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                  {connectStatus?.status === 'pending' ? 'Resume setup' : 'Set up payouts'}
                </Text>
              </>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

function FunnelRow({ icon, label, value, colors }: {
  icon: string;
  label: string;
  value: string;
  colors: Colors;
}) {
  return (
    <View style={[styles.funnelRow, { borderTopColor: colors.border }]}>
      <Feather name={icon as any} size={14} color={colors.accent} />
      <Text style={[styles.funnelLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
        {label}
      </Text>
      <Text style={[styles.funnelValue, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
        {value}
      </Text>
    </View>
  );
}

function JoinFeature({ icon, text, colors }: { icon: string; text: string; colors: Colors }) {
  return (
    <View style={styles.joinFeatureRow}>
      <Feather name={icon as any} size={13} color={colors.accent} />
      <Text style={[styles.joinFeatureText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
        {text}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    gap: 0,
  },
  topRow: {
    marginBottom: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  statusTitle: { fontSize: 15 },
  statusSub: { fontSize: 12.5, marginTop: 2 },
  statusCta: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  statusCtaText: { fontSize: 14 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  codeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    marginBottom: 20,
  },
  codeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBig: {
    fontSize: 32,
    letterSpacing: 1,
  },
  codeUrl: {
    fontSize: 13,
    marginTop: -4,
  },
  codeEditInput: {
    fontSize: 24,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    letterSpacing: 1,
  },
  editCodeNote: {
    fontSize: 12,
    lineHeight: 18,
  },
  editCodeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editCodeSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    paddingVertical: 11,
    minHeight: 40,
  },
  editCodeCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    borderWidth: 1,
    paddingVertical: 11,
  },
  editCodeBtnText: {
    fontSize: 14,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  linkBtnText: {
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 18,
    marginBottom: 12,
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  statValue: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 12,
  },
  pendingNote: {
    fontSize: 12,
    marginBottom: 24,
    marginTop: 2,
  },
  monthTable: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  monthName: {
    flex: 1,
    fontSize: 14,
  },
  monthRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  monthConv: {
    fontSize: 12,
  },
  monthEarnings: {
    fontSize: 14,
  },
  emptyNote: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  rateNote: {
    fontSize: 12,
    marginBottom: 16,
  },
  payoutCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutTitle: {
    fontSize: 15,
  },
  payoutBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  payoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 100,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  payoutBtnText: {
    fontSize: 14,
  },
  payoutsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  payoutsLinkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  payoutsLinkText: {
    fontSize: 13,
  },
  joinCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  joinBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  joinFeatures: {
    gap: 8,
  },
  joinFeatureRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  joinFeatureText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  joinBtn: {
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
  },
  joinBtnText: {
    fontSize: 15,
  },
  joinForm: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 8,
  },
  joinFormTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  countryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryPill: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  countryPillText: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  ftcRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  ftcText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  joinFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 100,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  submitBtnText: {
    fontSize: 14,
  },
  calcSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
    marginTop: -8,
  },
  pillRow: {
    gap: 8,
    paddingBottom: 16,
    paddingRight: 20,
  },
  pill: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 14,
  },
  funnelCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  funnelLabel: {
    flex: 1,
    fontSize: 13,
  },
  funnelValue: {
    fontSize: 16,
  },
  earningsCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 10,
  },
  earningsLabel: {
    fontSize: 11,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  earningsBig: {
    fontSize: 52,
    lineHeight: 56,
    marginBottom: 4,
  },
  earningsYearly: {
    fontSize: 14,
  },
  finePrint: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
  },
});
