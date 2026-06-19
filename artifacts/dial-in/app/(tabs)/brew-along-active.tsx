import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { getStepsForMethod } from '@/lib/brew-steps';

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

  const steps = getStepsForMethod(params.method, {
    dose: params.dose,
    water: params.water,
    waterTemp: params.waterTemp,
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [stepSeconds, setStepSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [stepDone, setStepDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  if (!currentStep) {
    router.replace('/(tabs)/tasting');
    return null;
  }

  // Last step is always manual — user taps when brew is done
  const hasDuration = currentStep.duration > 0 && !isLastStep;

  useEffect(() => {
    progressAnim.setValue(0);
    setStepSeconds(0);
    setStepDone(false);
    if (hasDuration) {
      setRunning(true);
    } else {
      setRunning(false);
    }
  }, [stepIndex]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setStepSeconds(prev => {
        const next = prev + 1;
        setTotalSeconds(t => t + 1);

        if (hasDuration) {
          Animated.timing(progressAnim, {
            toValue: next / currentStep.duration,
            duration: 200,
            useNativeDriver: false,
          }).start();

          if (next >= currentStep.duration) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setStepDone(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, hasDuration, currentStep.duration]);

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    }
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
        autoTime: formatTime(totalSeconds),
        waterTemp: params.waterTemp ?? '',
        grinderNotes: params.grinderNotes ?? '',
        adjustmentHistory: params.adjustmentHistory ?? '[]',
      },
    });
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const timerFinished = stepDone || !hasDuration;
  const isTimerRunning = hasDuration && running && !stepDone;

  const recipeInfo = [params.dose, params.water, params.waterTemp].filter(Boolean).join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.espresso }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.cream} />
        </Pressable>
        <Text style={[styles.topTitle, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
          {params.method}
        </Text>
        <Text style={[styles.totalTimer, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
          {formatTime(totalSeconds)}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  i < stepIndex
                    ? colors.cream
                    : i === stepIndex
                    ? 'rgba(255,255,255,0.6)'
                    : 'rgba(255,255,255,0.15)',
              },
            ]}
          />
        ))}
      </View>

      {recipeInfo ? (
        <View style={styles.recipeBar}>
          <Text style={[styles.recipeBarText, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
            {recipeInfo}
          </Text>
        </View>
      ) : null}

      <View style={styles.center}>
        <Text style={[styles.stepNumber, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
          Step {stepIndex + 1} of {steps.length}
        </Text>

        <Text style={[styles.stepTitle, { color: colors.cream, fontFamily: 'Fraunces_500Medium' }]}>
          {currentStep.title}
        </Text>

        <Text style={[styles.stepInstruction, { color: '#D4C4B4', fontFamily: 'DMSans_400Regular' }]}>
          {currentStep.instruction}
        </Text>

        {hasDuration && (
          <View style={styles.timerSection}>
            <Text style={[styles.timerDisplay, { color: stepDone ? '#A89080' : colors.cream, fontFamily: 'Fraunces_300Light' }]}>
              {stepDone ? '✓' : formatTime(Math.max(0, currentStep.duration - stepSeconds))}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: stepDone ? '#6B9E6B' : colors.cream, width: progressWidth },
                ]}
              />
            </View>
          </View>
        )}

        {(isLastStep || (!hasDuration && !stepDone)) && (
          <View style={[styles.manualBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[styles.manualText, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
              {isLastStep ? 'Tap when your brew is done.' : 'Take your time. Tap when ready.'}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {!isLastStep ? (
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: timerFinished ? colors.cream : 'rgba(255,255,255,0.2)',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleNext}
          >
            <Text
              style={[
                styles.nextBtnText,
                {
                  color: timerFinished ? colors.espresso : colors.cream,
                  fontFamily: 'DMSans_500Medium',
                },
              ]}
            >
              {isTimerRunning
                ? `Skip timer · Next: ${steps[stepIndex + 1].title} →`
                : `Next: ${steps[stepIndex + 1].title} →`}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: colors.cream, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleDone}
          >
            <Text style={[styles.nextBtnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
              Done — how did it taste? →
            </Text>
          </Pressable>
        )}

        <Pressable onPress={handleDone} style={styles.skipLink}>
          <Text style={[styles.skipLinkText, { color: '#A89080', fontFamily: 'DMSans_400Regular' }]}>
            Skip to tasting
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 15 },
  totalTimer: { fontSize: 14, minWidth: 40, textAlign: 'right' },
  progressTrack: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  recipeBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  recipeBarText: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  center: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 20,
  },
  stepNumber: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  stepInstruction: {
    fontSize: 17,
    lineHeight: 26,
  },
  timerSection: {
    gap: 16,
    marginTop: 8,
  },
  timerDisplay: {
    fontSize: 64,
    letterSpacing: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  manualBadge: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  manualText: { fontSize: 14 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  nextBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 17 },
  skipLink: { alignItems: 'center', paddingVertical: 4 },
  skipLinkText: { fontSize: 14 },
});
