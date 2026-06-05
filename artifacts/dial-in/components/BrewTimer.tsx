import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface BrewTimerProps {
  onUseTime: (time: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function BrewTimer({ onUseTime }: BrewTimerProps) {
  const colors = useColors();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [stopped, setStopped] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function handleStartPause() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!hasStarted) setHasStarted(true);
    if (running) {
      setStopped(true);
    } else {
      setStopped(false);
    }
    setRunning(r => !r);
  }

  function handleReset() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunning(false);
    setSeconds(0);
    setHasStarted(false);
    setStopped(false);
  }

  function handleUseTime() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUseTime(formatTime(seconds));
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <View style={styles.display}>
        <Text style={[styles.time, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          {formatTime(seconds)}
        </Text>
      </View>
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.btn, { backgroundColor: colors.espresso, opacity: pressed ? 0.8 : 1 }]}
          onPress={handleStartPause}
        >
          <Feather name={running ? 'pause' : 'play'} size={14} color={colors.cream} />
          <Text style={[styles.btnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
            {running ? 'Pause' : hasStarted ? 'Resume' : 'Start'}
          </Text>
        </Pressable>
        {hasStarted && (
          <Pressable
            style={({ pressed }) => [styles.btn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleReset}
          >
            <Text style={[styles.btnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>Reset</Text>
          </Pressable>
        )}
        {stopped && seconds > 0 && (
          <Pressable
            style={({ pressed }) => [styles.btn, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleUseTime}
          >
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'DMSans_500Medium' }]}>Use time</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  display: {
    alignItems: 'center',
  },
  time: {
    fontSize: 36,
    letterSpacing: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  btnText: {
    fontSize: 14,
  },
});
