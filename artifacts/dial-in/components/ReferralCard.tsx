import React, { useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { getReferralCode } from '@/lib/api';
import { useUser } from '@/context/UserContext';

export function ReferralCard() {
  const colors = useColors();
  const { email, referralCode, setReferralCode } = useUser();
  const [loading, setLoading] = useState(false);

  const referralLink = referralCode
    ? `https://www.coffeebrew.coach?ref=${referralCode}`
    : null;

  async function ensureCode() {
    if (referralCode || !email) return referralCode;
    setLoading(true);
    try {
      const { code } = await getReferralCode(email);
      setReferralCode(code);
      return code;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    const code = await ensureCode();
    if (!code) return;
    const link = `https://www.coffeebrew.coach?ref=${code}`;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // On iOS, `url` is appended after `message` — passing the URL in both fields
    // produces two link-preview cards in iMessage. Split them so there's one preview.
    Share.share(
      Platform.OS === 'ios'
        ? {
            message: "I've been using Coffee Brew Coach to dial in my coffee — give it a try:",
            url: link,
          }
        : {
            message: `I've been using Coffee Brew Coach to dial in my coffee — give it a try: ${link}`,
          }
    );
  }

  async function handleCopy() {
    const code = await ensureCode();
    if (!code) return;
    const link = `https://www.coffeebrew.coach?ref=${code}`;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', link);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="gift" size={16} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Give a friend a free brew
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            You both get +2 dial-ins when they brew for the first time
          </Text>
        </View>
      </View>

      {referralLink && (
        <View style={[styles.linkBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.link, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]} numberOfLines={1}>
            {referralLink}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btn, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
          onPress={handleShare}
          disabled={loading}
        >
          <Feather name="share-2" size={14} color={colors.cream} />
          <Text style={[styles.btnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>Share</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}
          onPress={handleCopy}
          disabled={loading}
        >
          <Feather name="copy" size={14} color={colors.espresso} />
          <Text style={[styles.btnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>Copy link</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  link: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: {
    fontSize: 14,
  },
});
