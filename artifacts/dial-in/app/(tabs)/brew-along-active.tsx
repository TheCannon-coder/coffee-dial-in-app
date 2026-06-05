import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function BrewAlongActiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    method: string;
    coffeeName?: string;
    dose?: string;
    water?: string;
    waterTemp?: string;
    grinderNotes?: string;
    adjustmentHistory?: string;
  }>();

  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(r => !r);
  }

  function handleDone() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/post-brew-details',
      params: {
        method: params.method,
        coffeeName: params.coffeeName ?? '',
        dose: params.dose ?? '',
        water: params.water ?? '',
        autoTime: formatTime(seconds),
        waterTemp: params.waterTemp ?? '',
        grinderNotes: params.grinderNotes ?? '',
        adjustmentHistory: params.adjustmentHistory ?? '[]',
      },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.espresso }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.cream} />
        </Pressable>
        <Text style={[styles.topTitle, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
          {params.method}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.center}>
        <Text style={[styles.timerDisplay, { color: colors.cream, fontFamily: 'Fraunces_300Light' }]}>
          {formatTime(seconds)}
        </Text>
        <Text style={[styles.timerSub, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
          {running ? 'Brewing...' : 'Paused'}
        </Text>

        <Pressable
          style={({ pressed }) => [styles.toggleBtn, { backgroundColor: 'rgba(255,255,255,0.1)', opacity: pressed ? 0.7 : 1 }]}
          onPress={handleToggle}
        >
          <Feather name={running ? 'pause' : 'play'} size={20} color={colors.cream} />
          <Text style={[styles.toggleBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
            {running ? 'Pause' : 'Resume'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.cream, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleDone}
        >
          <Text style={[styles.doneBtnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
            Done — how did it taste? →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 15 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timerDisplay: {
    fontSize: 80,
    letterSpacing: 4,
  },
  timerSub: {
    fontSize: 16,
    marginTop: -4,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  toggleBtnText: { fontSize: 16 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  doneBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 17 },
});
