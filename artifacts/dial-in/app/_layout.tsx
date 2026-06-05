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

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UserProvider } from '@/context/UserContext';

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
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <UserProvider>
                <RootLayoutNav />
              </UserProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
