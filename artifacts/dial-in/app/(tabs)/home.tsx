import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { BrewCard } from '@/components/BrewCard';
import { ReferralCard } from '@/components/ReferralCard';
import { getUser, getCustomerPortal } from '@/lib/api';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, isPro, usesRemaining, monthlyLimit, savedCoffees, updateUserStats, setReferralCode } = useUser();

  useEffect(() => {
    if (email) {
      getUser(email)
        .then(data => {
          updateUserStats(data.isPro, data.usesThisMonth, data.monthlyLimit);
          if (data.referralCode) setReferralCode(data.referralCode);
        })
        .catch(() => {});
    }
  }, [email]);

  async function handleManageSubscription() {
    if (!email) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { url } = await getCustomerPortal(email);
      if (url) WebBrowser.openBrowserAsync(url);
    } catch {
      // silent
    }
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
              Dial In
            </Text>
            <Text style={[styles.greeting, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              {greeting()}
            </Text>
            <Text style={[styles.subgreeting, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Ready to brew?
            </Text>
          </View>
          {email && (
            <View style={styles.statsBadge}>
              {isPro ? (
                <View style={[styles.proBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.proBadgeText, { color: '#fff', fontFamily: 'DMSans_500Medium' }]}>Pro</Text>
                </View>
              ) : (
                <Text style={[styles.usesText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  {usesRemaining !== null ? `${usesRemaining} left` : ''}
                </Text>
              )}
            </View>
          )}
        </View>

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
                Dial in your next cup
              </Text>
            </View>
            <View style={[styles.brewArrow, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Feather name="arrow-right" size={20} color={colors.cream} />
            </View>
          </View>
        </Pressable>

        {savedCoffees.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              Your coffees
            </Text>
            {savedCoffees.map(coffee => (
              <BrewCard
                key={coffee.id}
                coffee={coffee}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/repeat-brew', params: { coffeeId: coffee.id } });
                }}
              />
            ))}
          </View>
        )}

        {email && (
          <View style={styles.section}>
            <ReferralCard />
          </View>
        )}

        {email && (
          <Pressable onPress={handleManageSubscription} style={styles.manageLink}>
            <Text style={[styles.manageLinkText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Manage subscription
            </Text>
          </Pressable>
        )}
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
  wordmark: {
    fontSize: 16,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 26,
    lineHeight: 32,
  },
  subgreeting: {
    fontSize: 15,
    marginTop: 2,
  },
  statsBadge: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  proBadge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  proBadgeText: {
    fontSize: 13,
  },
  usesText: {
    fontSize: 13,
  },
  brewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  brewCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brewCardTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  brewCardSub: {
    fontSize: 14,
  },
  brewArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  manageLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  manageLinkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
