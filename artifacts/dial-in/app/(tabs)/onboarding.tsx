import React, { useState } from 'react';
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
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';

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
  const [email, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      router.replace('/home');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ensureAnonId();
    router.replace('/home');
  }

  return (
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
            Dial In
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
});
