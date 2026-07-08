import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import { useColors } from '@/hooks/useColors';
import { dialIn, submitFeedback } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { generateId, FREE_BREW_LIMIT } from '@/lib/storage';
import { checkAndAwardBadges, type Badge } from '@/lib/achievements';
import { ShareModal } from '@/components/ShareModal';
import { BadgeEarnedModal } from '@/components/BadgeEarnedModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { TastingChips } from '@/components/TastingChips';
import { TastingResult } from '@/components/TastingResult';

type Stage = 'selecting' | 'loading' | 'result';

export default function TastingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    method: string;
    coffeeName?: string;
    dose?: string;
    water?: string;
    brewTime?: string;
    waterTemp?: string;
    grinderNotes?: string;
    adjustmentHistory?: string;
    sessionId?: string;
  }>();

  const [sessionId] = useState<string>(
    () => params.sessionId ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
  );

  const { email, isPro, updateUserStats, addOrUpdateCoffee, ensureAnonId, setEmail: saveUserEmail } = useUser();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [freeText, setFreeText] = useState('');
  const [brewComparison, setBrewComparison] = useState<'better' | 'same' | 'worse' | null>(null);
  const [stage, setStage] = useState<Stage>('selecting');
  const [advice, setAdvice] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [usesRemaining, setUsesRemaining] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveEmail, setSaveEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);
  const [badgeIndex, setBadgeIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [resultSessionId, setResultSessionId] = useState<string | null>(null);

  const adjustmentHistory: string[] = (() => {
    try {
      return params.adjustmentHistory ? JSON.parse(params.adjustmentHistory) : [];
    } catch {
      return [];
    }
  })();

  function toggle(chip: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  const canSubmit = selected.size > 0 || freeText.trim().length > 0;

  async function handleDialIn() {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage('loading');

    const tastingNotes = Array.from(selected).join(', ');
    const currentAnonId = email ? undefined : await ensureAnonId();

    try {
      const result = await dialIn({
        email: email ?? undefined,
        anonId: currentAnonId ?? undefined,
        sessionId,
        method: params.method,
        coffeeName: params.coffeeName,
        dose: params.dose,
        water: params.water,
        brewTime: params.brewTime,
        waterTemp: params.waterTemp,
        grinderNotes: params.grinderNotes,
        tastingNotes,
        freeNotes: freeText,
        adjustmentHistory,
        brewComparison: brewComparison ?? undefined,
      });

      if ('error' in result && result.error === 'limit_reached') {
        router.push({
          pathname: '/paywall',
          params: { resetsOn: result.resetsOn, isAnonymous: email ? '0' : '1' },
        });
        setStage('selecting');
        return;
      }

      if ('advice' in result) {
        checkAndAwardBadges({
          method: params.method,
          coffeeName: params.coffeeName ?? '',
          adjustment: result.adjustment,
        }).then(earned => {
          if (earned.length > 0) {
            setTimeout(() => {
              setBadgeIndex(0);
              setPendingBadges(earned);
            }, 900);
          }
        }).catch(() => {});

        setAdvice(result.advice);
        setAdjustment(result.adjustment);
        setUsesRemaining(result.usesRemaining);
        setResultSessionId(result.sessionId);
        updateUserStats(result.isPro, FREE_BREW_LIMIT - result.usesRemaining, FREE_BREW_LIMIT);

        if (email) {
          const newHistory = [...adjustmentHistory, result.adjustment];
          addOrUpdateCoffee({
            id: generateId(),
            coffeeName: params.coffeeName ?? params.method,
            method: params.method,
            dose: params.dose ?? '',
            water: params.water ?? '',
            brewTime: params.brewTime ?? '',
            waterTemp: params.waterTemp ?? '',
            grinderNotes: params.grinderNotes ?? '',
            advice: result.advice,
            adjustment: result.adjustment,
            savedAt: new Date().toISOString(),
            adjustmentHistory: newHistory,
          });
          setSaved(true);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStage('result');
        if (adjustmentHistory.length > 0) {
          setTimeout(() => setShowFeedback(true), 700);
        }
      }
    } catch {
      setStage('selecting');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleFeedback(helpful: boolean) {
    setShowFeedback(false);
    if (resultSessionId) {
      submitFeedback(resultSessionId, helpful).catch(() => {});
    }
    if (helpful) {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        setTimeout(() => StoreReview.requestReview(), 800);
      }
    }
  }

  async function handleSaveWithEmail() {
    if (!saveEmail.includes('@')) return;
    setSaving(true);
    try {
      await saveUserEmail(saveEmail.trim().toLowerCase());
      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        advice={advice}
        adjustment={adjustment}
        method={params.method}
        coffeeName={params.coffeeName}
        onBadgeEarned={(badge) => {
          setShowShareModal(false);
          setTimeout(() => {
            setBadgeIndex(0);
            setPendingBadges([badge]);
          }, 400);
        }}
      />
      <FeedbackModal
        visible={showFeedback}
        onFeedback={handleFeedback}
      />
      {pendingBadges.length > 0 && (
        <BadgeEarnedModal
          badges={pendingBadges}
          index={badgeIndex}
          onNext={() => setBadgeIndex(i => i + 1)}
          onClose={() => setPendingBadges([])}
        />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} disabled={stage === 'loading'}>
          <Feather name="arrow-left" size={22} color={colors.espresso} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          {stage === 'result' ? 'Your result' : 'How did it taste?'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {stage !== 'result' && (
          <TastingChips
            selected={selected}
            onToggle={toggle}
            freeText={freeText}
            onFreeTextChange={setFreeText}
            brewComparison={brewComparison}
            onBrewComparisonChange={setBrewComparison}
            showComparison={adjustmentHistory.length > 0}
          />
        )}

        {stage === 'result' && (
          <TastingResult
            advice={advice}
            adjustment={adjustment}
            isPro={isPro}
            usesRemaining={usesRemaining}
            email={email}
            saved={saved}
            saveEmail={saveEmail}
            onSaveEmailChange={setSaveEmail}
            onSaveWithEmail={handleSaveWithEmail}
            saving={saving}
            onShare={() => setShowShareModal(true)}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        {stage === 'selecting' && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: canSubmit ? colors.espresso : colors.muted, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleDialIn}
            disabled={!canSubmit}
          >
            <Text style={[styles.primaryBtnText, { color: canSubmit ? colors.cream : colors.mutedForeground, fontFamily: 'DMSans_500Medium' }]}>
              Let's dial it in →
            </Text>
          </Pressable>
        )}
        {stage === 'loading' && (
          <View style={[styles.loadingRow, { backgroundColor: colors.espresso }]}>
            <ActivityIndicator color={colors.cream} size="small" />
            <Text style={[styles.loadingText, { color: colors.cream, fontFamily: 'DMSans_400Regular' }]}>
              Thinking...
            </Text>
          </View>
        )}
        {stage === 'result' && (
          <View style={styles.resultFooter}>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowShareModal(true);
              }}
            >
              <Feather name="share-2" size={16} color={colors.espresso} />
              <Text style={[styles.shareBtnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                Share this tip
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1, flex: 1 }]}
              onPress={() => router.push('/home')}
            >
              <Text style={[styles.primaryBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>Done</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primaryBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 17 },
  loadingRow: {
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 16 },
  resultFooter: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  shareBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  shareBtnText: { fontSize: 15 },
});
