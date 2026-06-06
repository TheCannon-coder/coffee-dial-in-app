import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { useNotifications } from '@/hooks/useNotifications';

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

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
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
      await setEmail(email.trim().toLowerCase());
      setShowNotifPrompt(true);
    } catch {
      setError('Something went wrong. Please try again.');
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
    setShowNotifPrompt(false);
    router.replace('/home');
  }

  function handleSkipNotifications() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNotifPrompt(false);
    router.replace('/home');
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
              <Text style={[styles.error, { color: colors.destructive, fontFamily: 'DMSans_400Regular' }]}>{error}</Text>
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

            <Text style={[styles.footnote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              10 free dial-ins every month. No password needed.
            </Text>
          </View>

          <Pressable onPress={handleSkip} style={styles.skip}>
            <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Continue without email →
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showNotifPrompt}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <View style={[styles.bellCircle, { backgroundColor: colors.secondary }]}>
              <Feather name="bell" size={28} color={colors.accent} />
            </View>

            <Text style={[styles.sheetTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              Never miss a reset
            </Text>
            <Text style={[styles.sheetBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Get a nudge on the 1st of each month when your free dial-ins reset, and a gentle reminder to brew on Saturdays.
            </Text>

            <View style={styles.sheetActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.sheetCta,
                  { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={handleEnableNotifications}
              >
                <Feather name="bell" size={16} color={colors.cream} style={{ marginRight: 8 }} />
                <Text style={[styles.sheetCtaText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                  Turn on reminders
                </Text>
              </Pressable>

              <Pressable onPress={handleSkipNotifications} style={styles.sheetSkip}>
                <Text style={[styles.sheetSkipText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  Not now
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    gap: 0,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  wordmark: {
    fontSize: 28,
  },
  badge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  headline: {
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  features: {
    gap: 16,
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  form: {
    gap: 12,
    marginBottom: 16,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    marginTop: -4,
  },
  cta: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
  },
  footnote: {
    fontSize: 13,
    textAlign: 'center',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(42,26,14,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 28,
  },
  bellCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  sheetBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  sheetActions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  sheetCta: {
    width: '100%',
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCtaText: {
    fontSize: 17,
  },
  sheetSkip: {
    paddingVertical: 8,
  },
  sheetSkipText: {
    fontSize: 14,
  },
});
