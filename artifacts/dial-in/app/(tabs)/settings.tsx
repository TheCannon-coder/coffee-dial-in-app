import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { useSubscription } from '@/lib/revenuecat';
import { useNotifications } from '@/hooks/useNotifications';
import { getCustomerPortal } from '@/lib/api';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, isPro: isProFromDB, logout } = useUser();
  const { isSubscribed } = useSubscription();
  const { enabled: notificationsEnabled, toggle: toggleNotifications, permission, reminderHour, reminderMinute, setReminderTime } = useNotifications();

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

  function handleSignOut() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Sign out?',
      'Your brews are saved to your account — sign back in anytime to pick up where you left off.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/onboarding');
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.espresso} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Brew reminders ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          NOTIFICATIONS
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Feather name="bell" size={16} color={colors.mutedForeground} />
            <Text style={[styles.rowLabel, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
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
            <View style={[styles.row, styles.rowDivider, { borderTopColor: colors.border }]}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                Remind me at
              </Text>
              <View style={styles.stepper}>
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setReminderTime((reminderHour + 23) % 24, reminderMinute);
                  }}
                >
                  <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
                </Pressable>
                <Text style={[styles.stepperValue, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                  {`${reminderHour % 12 === 0 ? 12 : reminderHour % 12}:${String(reminderMinute).padStart(2, '0')} ${reminderHour < 12 ? 'AM' : 'PM'}`}
                </Text>
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setReminderTime((reminderHour + 1) % 24, reminderMinute);
                  }}
                >
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
          )}

          {permission === 'denied' && (
            <Text style={[styles.deniedNote, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Enable notifications in iOS Settings to turn on reminders.
            </Text>
          )}
        </View>

        {/* ── Account ── */}
        {email && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              ACCOUNT
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Feather name="user" size={16} color={colors.mutedForeground} />
                <Text style={[styles.rowLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]} numberOfLines={1}>
                  {email}
                </Text>
              </View>
              <Pressable onPress={handleManageSubscription} style={[styles.row, styles.rowDivider, { borderTopColor: colors.border }]}>
                <Feather name="credit-card" size={16} color={colors.mutedForeground} />
                <Text style={[styles.rowLabel, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
                  Manage subscription
                </Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
              <Pressable onPress={handleSignOut} style={[styles.row, styles.rowDivider, { borderTopColor: colors.border }]}>
                <Feather name="log-out" size={16} color={colors.mutedForeground} />
                <Text style={[styles.rowLabel, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
                  Sign out
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Coffee Brew Coach v{Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginTop: 24, marginBottom: 8 },
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: { borderTopWidth: 1 },
  rowLabel: { flex: 1, fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperValue: { fontSize: 15, minWidth: 76, textAlign: 'center' },
  deniedNote: { fontSize: 13, paddingBottom: 14 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 32 },
});
