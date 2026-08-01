import {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
  useFonts as useFrauncesFonts,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  useFonts as useDMSansFonts,
} from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Alert, Linking } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UserProvider } from '@/context/UserContext';
import { initializeRevenueCat, SubscriptionProvider } from '@/lib/revenuecat';
import { setItem, KEYS } from '@/lib/storage';

/**
 * Extract a referral code from any incoming URL.
 * Handles both:
 *  • https://www.coffeebrew.coach?ref=CODE  (universal links / web share)
 *  • dial-in://ref?code=CODE               (custom scheme from in-app banner)
 */
function extractRefCode(url: string): string | null {
  try {
    const match = url.match(/[?&](?:ref|code)=([A-Z0-9][A-Z0-9-]*)/i);
    return match ? match[1].trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

try {
  initializeRevenueCat();
} catch (err: unknown) {
  // Fail silently: a purchases-SDK hiccup shouldn't greet users with a
  // vendor-named error alert on launch. The paywall surfaces its own
  // friendly error state if offerings can't load.
  console.warn('RevenueCat init failed', err);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [frauncesFontsLoaded, frauncesError] = useFrauncesFonts({
    Fraunces_300Light,
    Fraunces_300Light_Italic,
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
  });

  const [dmSansFontsLoaded, dmSansError] = useDMSansFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const fontsLoaded = frauncesFontsLoaded && dmSansFontsLoaded;
  const fontError = frauncesError || dmSansError;

  // Capture referral code from deep-link / universal link on cold launch
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) {
        const code = extractRefCode(url);
        if (code) setItem(KEYS.REF, code).catch(() => {});
      }
    }).catch(() => {});

    const sub = Linking.addEventListener('url', ({ url }) => {
      const code = extractRefCode(url);
      if (code) setItem(KEYS.REF, code).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <SubscriptionProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <UserProvider>
                    <RootLayoutNav />
                  </UserProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SubscriptionProvider>
          </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
