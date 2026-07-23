import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { useNotifications } from '@/hooks/useNotifications';
import { signInWithApple, redeemReferralCode } from '@/lib/api';
import { NotificationSheet } from '@/components/NotificationSheet';
import { getItem, removeItem, KEYS } from '@/lib/storage';

const FEATURES = [
  {
    icon: 'coffee' as const,
    title: 'Works with any brew method',
    desc: 'V60, AeroPress, espresso, French press, Chemex, Moka pot',
  },
  {
    icon: 'target' as const,
    title: 'One tip at a time',
    desc: 'Changing too much at once makes it impossible to know what worked',
  },
  {
    icon: 'droplet' as const,
    title: 'Taste-based advice',
    desc: 'Tap what you tasted, get a specific next step',
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setEmail, ensureAnonId } = useUser();
  const { enable } = useNotifications();

  const [email, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [navigateOnDismiss, setNavigateOnDismiss] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [showCodeField, setShowCodeField] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');

  // Pre-fill referral code from deep-link (stored by _layout.tsx URL handler)
  useEffect(() => {
    getItem<string>(KEYS.REF).then(stored => {
      if (stored) {
        setReferralCodeInput(stored);
        setShowCodeField(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }

  async function applyPendingCode(signedInEmail: string) {
    const code = referralCodeInput.trim().toUpperCase();
    if (!code) return;
    try {
      await redeemReferralCode(signedInEmail, code);
      // Clear the stored deep-link code once it has been applied
      await removeItem(KEYS.REF);
    } catch {
      // best-effort — never block sign-in
    }
  }

  async function handleStart() {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const normalised = email.trim().toLowerCase();
      await setEmail(normalised);
      await applyPendingCode(normalised);
      setShowNotifPrompt(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const result = await signInWithApple(credential.user, credential.email ?? undefined);
      await setEmail(result.email);
      await applyPendingCode(result.email);
      setShowNotifPrompt(true);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ensureAnonId();
    setShowNotifPrompt(true);
  }

  async function handleEnableNotifications() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await enable();
    setNavigateOnDismiss(true);
    setShowNotifPrompt(false);
  }

  function handleSkipNotifications() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNavigateOnDismiss(true);
    setShowNotifPrompt(false);
  }

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={[styles.wordmark, { color: colors.espresso, fontFamily: 'Fraunces_300Light_Italic' }]}>
              Coffee Brew Coach
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: '#fff', fontFamily: 'DMSans_500Medium' }]}>
                Coffee coaching
              </Text>
            </View>
          </View>

          <Text style={[styles.headline, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Free coffee coaching{'\n'}for home brewers.
          </Text>
          <Text style={[styles.subheading, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
            Tell us how your cup tasted — and we'll give you one clear adjustment to try next time. No guesswork, no jargon.
          </Text>

          <View style={styles.features}>
            {FEATURES.map(f => (
              <View key={f.title} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={f.icon} size={16} color={colors.accent} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                    {f.title}
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                    {f.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.form}>
            {appleAvailable && (
              <>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={100}
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                />
                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                    or
                  </Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>
              </>
            )}

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: error ? colors.destructive : colors.border,
                  color: colors.espresso,
                  fontFamily: 'DMSans_400Regular',
                },
              ]}
              placeholder="Your email address"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={t => { setEmailInput(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
            {error ? (
              <Text style={[styles.error, { color: colors.destructive, fontFamily: 'DMSans_400Regular' }]}>
                {error}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.cta, { backgroundColor: colors.espresso, opacity: pressed || loading ? 0.8 : 1 }]}
              onPress={handleStart}
              disabled={loading}
            >
              <Text style={[styles.ctaText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                {loading ? 'One moment...' : 'Start brewing →'}
              </Text>
            </Pressable>

            {/* Referral code */}
            {!showCodeField ? (
              <Pressable onPress={() => setShowCodeField(true)} hitSlop={8}>
                <Text style={[styles.codeLink, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Have a referral code?
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.codeRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.codeInput, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
                  placeholder="Enter code (e.g. BREW-ABC1)"
                  placeholderTextColor={colors.mutedForeground}
                  value={referralCodeInput}
                  onChangeText={v => setReferralCodeInput(v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  maxLength={24}
                />
                {referralCodeInput.length > 0 && (
                  <Feather name="check" size={16} color={colors.accent} />
                )}
              </View>
            )}

            <Text style={[styles.footnote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              10 free coaching sessions every month. No password needed.
            </Text>
          </View>

          <Pressable onPress={handleSkip} style={styles.skip}>
            <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Continue without email →
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <NotificationSheet
        visible={showNotifPrompt}
        onEnable={handleEnableNotifications}
        onSkip={handleSkipNotifications}
        onDismiss={() => { if (navigateOnDismiss) router.replace('/home'); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 0 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  wordmark: { fontSize: 28 },
  badge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12 },
  headline: { fontSize: 32, lineHeight: 40, marginBottom: 12 },
  subheading: { fontSize: 16, lineHeight: 24, marginBottom: 28 },
  features: { gap: 16, marginBottom: 32 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 15 },
  featureDesc: { fontSize: 13, lineHeight: 18 },
  form: { gap: 12, marginBottom: 16 },
  appleBtn: { height: 52, width: '100%' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  error: { fontSize: 13, marginTop: -4 },
  cta: { borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontSize: 17 },
  footnote: { fontSize: 13, textAlign: 'center' },
  skip: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14 },
  codeLink: { fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  codeInput: { flex: 1, fontSize: 15, letterSpacing: 1 },
});
