import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useUser, SavedCoffee } from '@/context/UserContext';
import { visibleBrews } from '@/lib/brew-history';
import { computeStreak } from '@/lib/streaks';
import { WeeklyRecap } from '@/components/WeeklyRecap';
import { useNotifications } from '@/hooks/useNotifications';
import { CoffeeFolder } from '@/components/CoffeeFolder';
import { AchievementBadge } from '@/components/AchievementBadge';
import { BadgeDetailModal } from '@/components/BadgeDetailModal';
import { getUser, getCustomerPortal, getPendingFeedback, submitFeedback, dismissFeedback, redeemReferralCode, getAffiliateStats, syncSubscription, type PendingFeedback } from '@/lib/api';
import { getRcAppUserId } from '@/lib/revenuecat';
import { getItem, removeItem, getBrewCount, KEYS } from '@/lib/storage';
import { getEarnedBadgeIds, ALL_BADGES, BadgeId, type Badge } from '@/lib/achievements';
import { useSubscription } from '@/lib/revenuecat';

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'grinding finer',
  grind_coarser: 'grinding coarser',
  steep_shorter: 'steeping shorter',
  steep_longer: 'steeping longer',
  more_coffee: 'using more coffee',
  less_coffee: 'using less coffee',
  more_water: 'using more water',
  less_water: 'using less water',
  lower_temp: 'a lower water temp',
  higher_temp: 'a higher water temp',
  pre_infusion: 'adding a pre-infusion',
  bloom: 'blooming longer',
};

function adjustmentPrompt(adjustment: string): string {
  const label = ADJUSTMENT_LABELS[adjustment] ?? adjustment.replace(/_/g, ' ');
  return `Did ${label} help?`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

function groupCoffees(coffees: SavedCoffee[]): { name: string; sessions: SavedCoffee[] }[] {
  const map = new Map<string, SavedCoffee[]>();
  for (const c of coffees) {
    const key = c.coffeeName || c.method;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.entries())
    .map(([name, sessions]) => ({
      name,
      sessions: sessions.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    }))
    .sort((a, b) => new Date(b.sessions[0].savedAt).getTime() - new Date(a.sessions[0].savedAt).getTime());
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_DISMISS_THRESHOLD = SCREEN_WIDTH * 0.3;

function SwipeableFeedbackCard({
  pendingFeedback,
  feedbackSubmitting,
  colors,
  onAnswer,
  onDismiss,
}: {
  pendingFeedback: PendingFeedback;
  feedbackSubmitting: boolean;
  colors: ReturnType<typeof useColors>;
  onAnswer: (wasHelpful: boolean) => void;
  onDismiss: () => void;
}) {
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_DISMISS_THRESHOLD) {
        const direction = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * SCREEN_WIDTH, { duration: 200 });
        cardOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
      } else {
        translateX.value = withTiming(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: cardOpacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.brewCard,
          { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
          animatedStyle,
        ]}
      >
        <Text style={[styles.feedbackGateLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Before your next brew
        </Text>
        <Text style={[styles.feedbackGateQuestion, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          Was your last{pendingFeedback.method ? ` ${pendingFeedback.method}` : ''} brew better?
        </Text>
        {pendingFeedback.coffeeName ? (
          <Text style={[styles.feedbackGateContext, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            {pendingFeedback.coffeeName}
          </Text>
        ) : null}
        <View style={styles.feedbackGateBtns}>
          <Pressable
            style={({ pressed }) => [
              styles.feedbackGateBtn,
              { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed || feedbackSubmitting ? 0.6 : 1 },
            ]}
            disabled={feedbackSubmitting}
            onPress={() => onAnswer(false)}
          >
            <Text style={styles.feedbackGateBtnEmoji}>😕</Text>
            <Text style={[styles.feedbackGateBtnLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium' }]}>Same or worse</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.feedbackGateBtn,
              { backgroundColor: colors.espresso, borderColor: colors.espresso, opacity: pressed || feedbackSubmitting ? 0.6 : 1 },
            ]}
            disabled={feedbackSubmitting}
            onPress={() => onAnswer(true)}
          >
            <Text style={styles.feedbackGateBtnEmoji}>☕️</Text>
            <Text style={[styles.feedbackGateBtnLabel, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>Yes, better!</Text>
          </Pressable>
        </View>
        <Text style={[styles.feedbackGateSwipeHint, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Swipe to dismiss
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, isPro: isProFromDB, usesRemaining, savedCoffees, updateUserStats, setReferralCode } = useUser();
  const { isSubscribed } = useSubscription();
  const isPro = isProFromDB || isSubscribed;
  const { enabled: notificationsEnabled, toggle: toggleNotifications, permission, reminderHour, reminderMinute, setReminderTime } = useNotifications();
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<BadgeId[]>([]);
  // null = unknown (don't flash either layout while loading)
  const [hasBrewed, setHasBrewed] = useState<boolean | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedback | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  useEffect(() => {
    getEarnedBadgeIds().then(setEarnedBadgeIds).catch(() => {});
  }, []);

  useEffect(() => {
    if (email) {
      getUser(email)
        .then(async data => {
          // Apple purchases never reach the server on their own — if the
          // device has an active entitlement the server doesn't know about,
          // sync it (server re-verifies with RevenueCat before trusting us).
          if (!data.isPro && isSubscribed) {
            const rcId = await getRcAppUserId();
            if (rcId) {
              const synced = await syncSubscription(email, rcId).catch(() => null);
              if (synced?.isPro) {
                updateUserStats(true, data.usesThisMonth, data.monthlyLimit);
                if (data.referralCode) setReferralCode(data.referralCode);
                return;
              }
            }
          }
          updateUserStats(data.isPro, data.usesThisMonth, data.monthlyLimit);
          if (data.referralCode) setReferralCode(data.referralCode);
        })
        .catch(() => {});
    }
  }, [email, isSubscribed]);

  // Refetch on every focus (not just mount) so that answering the in-tasting
  // "Better than your last brew?" question clears wasHelpful server-side and
  // this fallback doesn't show a stale prompt when the user returns home.
  // Also check for a pending referral code from a deep-link.
  useFocusEffect(
    React.useCallback(() => {
      getBrewCount().then(c => setHasBrewed(c > 0)).catch(() => setHasBrewed(true));
      if (email) {
        getPendingFeedback(email)
          .then(setPendingFeedback)
          .catch(() => {});

        // Refresh on focus so the footer link flips to "Affiliate dashboard"
        // right after the user is approved on the affiliate screen.
        getAffiliateStats(email)
          .then(stats => setIsAffiliate(!!stats.isAffiliate))
          .catch(() => {});

        // If the user opened the app via a referral link, claim the code now
        getItem<string>(KEYS.REF).then(async pendingCode => {
          if (!pendingCode) return;
          // Clear it immediately so it doesn't prompt again on the next focus
          await removeItem(KEYS.REF);
          Alert.alert(
            '🎁 You have a referral code',
            `Apply code "${pendingCode}" to get a free month of Pro?`,
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'Apply it',
                onPress: async () => {
                  try {
                    const result = await redeemReferralCode(email, pendingCode);
                    if (result.error) {
                      Alert.alert('Code not applied', result.error);
                    } else {
                      Alert.alert('✓ Code applied', result.message ?? 'You have one free month of Pro!');
                    }
                  } catch {
                    Alert.alert('Something went wrong', 'Please try again later.');
                  }
                },
              },
            ],
          );
        }).catch(() => {});
      }
    }, [email])
  );

  async function handleManageSubscription() {
    if (!email) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isSubscribed) {
      Alert.alert(
        'Manage Subscription',
        'Your subscription is managed through Apple. Go to Settings → Apple ID → Subscriptions to make changes.',
        [
          { text: 'Open Settings', onPress: () => Linking.openURL('https://apps.apple.com/account/subscriptions') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    try {
      const result = await getCustomerPortal(email);
      if ('url' in result && result.url) {
        WebBrowser.openBrowserAsync(result.url);
      } else if (isProFromDB) {
        // Pro without a billed subscription on this device: permanent Pro
        // from referrals, granted free months, or an Apple sub the sandbox
        // can't see (TestFlight). Nothing to manage — say so, don't error.
        Alert.alert(
          'Pro Access Active',
          'Your Pro access is active on this account. If you subscribed through the App Store, you can manage it in Settings → Apple ID → Subscriptions.',
          [
            { text: 'Open Settings', onPress: () => Linking.openURL('https://apps.apple.com/account/subscriptions') },
            { text: 'OK', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription linked to this account.');
      }
    } catch {
      Alert.alert('Something Went Wrong', 'Unable to open the subscription portal. Please try again.');
    }
  }

  const showProNudge = !isPro && !!email;
  const { visible: visibleCoffees } = visibleBrews(savedCoffees, isPro);
  const coffeeGroups = groupCoffees(visibleCoffees);
  // Streak and recap read the FULL local history — habit tracking is not
  // gated by tier, only the visible brew list is.
  const streak = computeStreak(savedCoffees);
  const earnedBadges = ALL_BADGES.filter(b => earnedBadgeIds.includes(b.id));

  // ── First-brew railroad: brand-new users see one focused path and nothing
  // else. Everything unlocks after brew #1. (null = still loading; render
  // nothing rather than flashing the wrong layout.)
  if (hasBrewed === null && savedCoffees.length === 0) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (hasBrewed === false && savedCoffees.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: insets.top + 20 }}>
        <Text style={[styles.wordmark, { color: colors.espresso, fontFamily: 'Fraunces_300Light_Italic' }]}>
          Coffee Brew Coach
        </Text>
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: insets.bottom + 80 }}>
          <Text style={[styles.firstBrewTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Let's brew your{'\n'}first coffee.
          </Text>
          <Text style={[styles.firstBrewSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Pick your brewer, follow along, and get your first personalized tip. Everything else unlocks after your first cup.
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/first-brew');
            }}
            style={({ pressed }) => [styles.firstBrewBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.firstBrewBtnText, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>
              Start my first brew
            </Text>
            <Feather name="arrow-right" size={20} color={colors.cream} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.wordmark, { color: colors.espresso, fontFamily: 'Fraunces_300Light_Italic' }]}>
              Coffee Brew Coach
            </Text>
            <Text style={[styles.greeting, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              {greeting()}
            </Text>
            <Text style={[styles.subgreeting, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Ready to brew?
            </Text>
            {streak.current >= 2 && (
              <Text style={[styles.streakText, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
                🔥 {streak.current}-day streak{streak.brewedToday ? '' : ' — brew today to keep it'}
              </Text>
            )}
          </View>
          {email && (
            <View style={styles.statsBadge}>
              {isPro ? (
                <View style={[styles.proBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.proBadgeText, { color: '#fff', fontFamily: 'DMSans_500Medium' }]}>Pro</Text>
                </View>
              ) : (
                <Text style={[styles.usesText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  {Number.isFinite(usesRemaining) ? `${usesRemaining} left` : ''}
                </Text>
              )}
            </View>
          )}
        </View>

        {pendingFeedback ? (
          <SwipeableFeedbackCard
            pendingFeedback={pendingFeedback}
            feedbackSubmitting={feedbackSubmitting}
            colors={colors}
            onAnswer={async (wasHelpful) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setFeedbackSubmitting(true);
              await submitFeedback(pendingFeedback.sessionId, wasHelpful).catch(() => {});
              setPendingFeedback(null);
              setFeedbackSubmitting(false);
            }}
            onDismiss={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              dismissFeedback(pendingFeedback.sessionId).catch(() => {});
              setPendingFeedback(null);
            }}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.brewCard,
              { backgroundColor: colors.espresso, opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/brew-setup');
            }}
          >
            <View style={styles.brewCardContent}>
              <View>
                <Text style={[styles.brewCardTitle, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>
                  Brew a new coffee
                </Text>
                <Text style={[styles.brewCardSub, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
                  Perfect your next cup
                </Text>
              </View>
              <View style={[styles.brewArrow, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Feather name="arrow-right" size={20} color={colors.cream} />
              </View>
            </View>
          </Pressable>
        )}

        {showProNudge && (
          <Pressable
            style={({ pressed }) => [
              styles.proNudge,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/paywall');
            }}
          >
            <View style={styles.proNudgeLeft}>
              <Text style={[styles.proNudgeTitle, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                {Number.isFinite(usesRemaining) && (usesRemaining as number) <= 3
                  ? `Only ${usesRemaining} session${usesRemaining === 1 ? '' : 's'} left this month`
                  : 'Upgrade to Pro'}
              </Text>
              <Text style={[styles.proNudgeSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                Unlimited coaching · No monthly cap
              </Text>
            </View>
            <View style={[styles.proNudgeBtn, { backgroundColor: colors.espresso }]}>
              <Text style={[styles.proNudgeBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                Go Pro
              </Text>
            </View>
          </Pressable>
        )}

        {coffeeGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              Your coffees
            </Text>
            {coffeeGroups.slice(0, 3).map(group => (
              <CoffeeFolder
                key={group.name}
                coffeeName={group.name}
                sessions={group.sessions}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/coffee-detail', params: { coffeeName: group.name } });
                }}
              />
            ))}
            {coffeeGroups.length > 3 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/all-coffees');
                }}
                style={({ pressed }) => [styles.seeAllBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.seeAllText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                  See all {coffeeGroups.length} coffees
                </Text>
                <Feather name="chevron-right" size={16} color={colors.espresso} />
              </Pressable>
            )}
          </View>
        )}

        <WeeklyRecap coffees={savedCoffees} />

        {earnedBadges.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              Achievements
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeRow}
            >
              {earnedBadges.map(badge => (
                <Pressable
                  key={badge.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedBadge(badge);
                  }}
                >
                  <AchievementBadge badge={badge} earned />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />

        <View style={[styles.settingsRow, { borderTopColor: colors.border }]}>
          <Feather name="bell" size={15} color={colors.mutedForeground} />
          <Text style={[styles.settingsLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Brew reminders
          </Text>
          <Switch
            value={notificationsEnabled === true}
            onValueChange={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleNotifications();
            }}
            thumbColor={notificationsEnabled ? colors.accent : colors.card}
            trackColor={{ false: colors.border, true: colors.accent + '55' }}
            ios_backgroundColor={colors.border}
            disabled={permission === 'denied'}
          />
        </View>

        {notificationsEnabled === true && permission === 'granted' && (
          <View style={[styles.reminderTimeRow, { borderColor: colors.border }]}>
            <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Remind me at
            </Text>
            <View style={styles.reminderTimeStepper}>
              <Pressable
                hitSlop={10}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const h = (reminderHour + 23) % 24;
                  setReminderTime(h, reminderMinute);
                }}
              >
                <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              </Pressable>
              <Text style={[styles.reminderTimeValue, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                {`${reminderHour % 12 === 0 ? 12 : reminderHour % 12}:${String(reminderMinute).padStart(2, '0')} ${reminderHour < 12 ? 'AM' : 'PM'}`}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const h = (reminderHour + 1) % 24;
                  setReminderTime(h, reminderMinute);
                }}
              >
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        )}

        {permission === 'denied' && (
          <Text style={[styles.deniedNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
            Enable notifications in Settings to turn on reminders.
          </Text>
        )}

        {email && (
          <Pressable onPress={handleManageSubscription} style={styles.manageLink}>
            <Text style={[styles.manageLinkText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Manage subscription
            </Text>
          </Pressable>
        )}

        <View style={[styles.affiliateRow, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/affiliate');
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={[styles.affiliateLinkText, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
              {isAffiliate ? 'Affiliate dashboard' : 'Become an affiliate'}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  wordmark: { fontSize: 16, marginBottom: 8 },
  greeting: { fontSize: 26, lineHeight: 32 },
  subgreeting: { fontSize: 15, marginTop: 2 },
  streakText: { fontSize: 13, marginTop: 6 },
  firstBrewTitle: { fontSize: 36, lineHeight: 42 },
  firstBrewSub: { fontSize: 16, lineHeight: 23, marginTop: 14, marginBottom: 32 },
  firstBrewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 24,
    paddingVertical: 20,
  },
  firstBrewBtnText: { fontSize: 19 },
  statsBadge: { alignItems: 'flex-end', paddingTop: 4 },
  proBadge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  proBadgeText: { fontSize: 13 },
  usesText: { fontSize: 13 },
  brewCard: { borderRadius: 16, padding: 20, marginBottom: 12 },
  proNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  proNudgeLeft: { flex: 1, marginRight: 12 },
  proNudgeTitle: { fontSize: 15, marginBottom: 2 },
  proNudgeSub: { fontSize: 12 },
  proNudgeBtn: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  proNudgeBtnText: { fontSize: 14 },
  feedbackGateLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  feedbackGateQuestion: { fontSize: 20, marginBottom: 4 },
  feedbackGateContext: { fontSize: 13, marginBottom: 16 },
  feedbackGateBtns: { flexDirection: 'row', gap: 10 },
  feedbackGateBtn: { flex: 1, borderRadius: 14, borderWidth: 1.5, paddingVertical: 16, alignItems: 'center', gap: 6 },
  feedbackGateBtnEmoji: { fontSize: 24 },
  feedbackGateBtnLabel: { fontSize: 14 },
  feedbackGateSwipeHint: { fontSize: 11, textAlign: 'center', marginTop: 12 },
  brewCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brewCardTitle: { fontSize: 20, marginBottom: 4 },
  brewCardSub: { fontSize: 14 },
  brewArrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  badgeRow: { gap: 10, paddingBottom: 4 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  settingsLabel: { flex: 1, fontSize: 14 },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: -1,
    marginBottom: 4,
  },
  reminderTimeLabel: { fontSize: 13 },
  reminderTimeStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reminderTimeValue: { fontSize: 14, minWidth: 72, textAlign: 'center' },
  deniedNote: { fontSize: 12, lineHeight: 16, marginTop: -6, marginBottom: 4 },
  manageLink: { alignItems: 'center', paddingVertical: 12 },
  manageLinkText: { fontSize: 14, textDecorationLine: 'underline' },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 2,
  },
  seeAllText: { fontSize: 14 },
  affiliateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  affiliateLinkText: { fontSize: 13, textDecorationLine: 'underline' },
});
