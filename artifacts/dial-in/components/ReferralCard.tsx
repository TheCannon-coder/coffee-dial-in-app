import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { getReferralCode, getFriendReferralStats, type FriendReferralStats } from '@/lib/api';
import { useUser } from '@/context/UserContext';

const PERMANENT_PRO_AT = 10;

export function ReferralCard() {
  const colors = useColors();
  const { email, referralCode, setReferralCode } = useUser();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<FriendReferralStats | null>(null);

  useEffect(() => {
    if (!email) return;
    getFriendReferralStats(email).then(setStats).catch(() => {});
  }, [email]);

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
    // The code must live in the TEXT, not just the link — a new install loses
    // the ?ref= param on its trip through the App Store, so the friend needs
    // the code visible to type in at signup.
    const pitch = `I've been using Coffee Brew Coach to dial in my coffee. Sign up with my code ${code} and you get a month of Pro free:`;
    // On iOS, `url` is appended after `message` — passing the URL in both fields
    // produces two link-preview cards in iMessage. Split them so there's one preview.
    Share.share(
      Platform.OS === 'ios'
        ? { message: pitch, url: link }
        : { message: `${pitch} ${link}` }
    );
  }

  async function handleCopy() {
    const code = await ensureCode();
    if (!code) return;
    const link = `https://www.coffeebrew.coach?ref=${code}`;
    await Clipboard.setStringAsync(`Sign up with my code ${code} and you get a month of Coffee Brew Coach Pro free: ${link}`).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', `Your code ${code} and link are ready to paste.`);
  }

  // The card needs an account to attach the code to.
  if (!email) return null;

  const qualifying = stats?.qualifyingCount ?? 0;
  const pending = stats?.pendingCount ?? 0;
  const isPermanent = stats?.proPermanent === true;
  const progress = Math.min(qualifying / PERMANENT_PRO_AT, 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="gift" size={16} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Give a month, get a month
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Friends get a month of Pro free with your code. When they log 3 brews, you get a month too.
          </Text>
        </View>
      </View>

      {/* The ladder: 10 qualifying friends = Pro for life */}
      {isPermanent ? (
        <View style={[styles.ladderBox, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.ladderHeadline, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
            🎉 You've earned Pro for life
          </Text>
          <Text style={[styles.ladderSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Thanks for spreading the word — keep sharing, your friends still get their free month.
          </Text>
        </View>
      ) : (
        <View style={styles.ladder}>
          <View style={styles.ladderLabels}>
            <Text style={[styles.ladderHeadline, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
              {qualifying} of {PERMANENT_PRO_AT} friends
            </Text>
            <Text style={[styles.ladderGoal, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
              {PERMANENT_PRO_AT} = Pro for life
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${Math.max(progress * 100, 2)}%` }]} />
          </View>
          {pending > 0 && (
            <Text style={[styles.ladderSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              {pending} {pending === 1 ? 'friend is' : 'friends are'} brewing toward your next free month
            </Text>
          )}
        </View>
      )}

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
  ladder: {
    gap: 6,
  },
  ladderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ladderHeadline: {
    fontSize: 13,
  },
  ladderGoal: {
    fontSize: 12,
  },
  ladderBox: {
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  ladderSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
