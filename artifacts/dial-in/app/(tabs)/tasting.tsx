import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { TasteChip } from '@/components/TasteChip';
import { dialIn } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { generateId, getBrewCount, incrementBrewCount, FREE_BREW_LIMIT } from '@/lib/storage';
import { checkAndAwardBadges, type Badge } from '@/lib/achievements';
import { recordBrewFields, getActiveRecommendations, type GearItem } from '@/lib/gear-tracker';
import { ShareModal } from '@/components/ShareModal';
import { BadgeEarnedModal } from '@/components/BadgeEarnedModal';

type Stage = 'selecting' | 'loading' | 'result';

const CHIP_GROUPS = [
  {
    label: 'Tasted good',
    chips: ['Sweet', 'Bright', 'Juicy', 'Balanced', 'Clean', 'Smooth', 'Silky', 'Syrupy', 'Crisp', 'Tangy'],
  },
  {
    label: 'Too sharp or sour',
    chips: ['Sour', 'Sharp', 'Salty', 'Metallic', 'Tart', 'Green / grassy', 'Short finish', 'No sweetness'],
  },
  {
    label: 'Too bitter or harsh',
    chips: ['Bitter', 'Harsh', 'Dry', 'Astringent', 'Flat', 'Burnt', 'Chalky', 'Lingers too long'],
  },
  {
    label: 'Strength & body',
    chips: ['Watery', 'Weak', 'Thin', 'Tea-like', 'Heavy', 'Thick', 'Muddy', 'Sludgy'],
  },
  {
    label: 'Flavour character',
    chips: ['Fruity', 'Floral', 'Chocolate', 'Nutty', 'Caramel', 'Honey', 'Tropical', 'Funky', 'Winey', 'Earthy', 'Spicy'],
  },
];

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'Grind finer',
  grind_coarser: 'Grind coarser',
  more_coffee: 'Use more coffee',
  less_coffee: 'Use less coffee',
  steep_longer: 'Steep longer',
  steep_shorter: 'Steep shorter',
  none: 'Leave it as-is',
};

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
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);
  const [badgeIndex, setBadgeIndex] = useState(0);

  const adjustmentHistory: string[] = params.adjustmentHistory
    ? JSON.parse(params.adjustmentHistory)
    : [];

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

    // Enforce local brew limit for non-pro users
    if (!isPro) {
      const count = await getBrewCount();
      if (count >= FREE_BREW_LIMIT) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);
        router.push({
          pathname: '/paywall',
          params: {
            resetsOn: nextMonth.toISOString(),
            isAnonymous: email ? '0' : '1',
          },
        });
        setStage('selecting');
        return;
      }
    }

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
        // Increment local brew count on success
        if (!isPro) await incrementBrewCount();

        // Check and award achievements — show modal after result screen renders
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
        const serverRemaining = result.usesRemaining;
        setUsesRemaining(serverRemaining);
        updateUserStats(result.isPro, FREE_BREW_LIMIT - serverRemaining, FREE_BREW_LIMIT);

        if (email) {
          const newHistory = [...adjustmentHistory, result.adjustment];
          const coffee = {
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
          };
          addOrUpdateCoffee(coffee);
          setSaved(true);
        }

        // Track missing fields and check for gear recommendations (fire and forget)
        recordBrewFields({
          dose: params.dose,
          waterTemp: params.waterTemp,
          grinderNotes: params.grinderNotes,
          method: params.method,
        }).then(() => getActiveRecommendations())
          .then(setGearItems)
          .catch(() => {});

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStage('result');
      }
    } catch {
      setStage('selecting');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const isAnon = !email;

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
          <>
            {CHIP_GROUPS.map(group => (
              <View key={group.label} style={styles.chipGroup}>
                <Text style={[styles.groupLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  {group.label}
                </Text>
                <View style={styles.chips}>
                  {group.chips.map(chip => (
                    <TasteChip
                      key={chip}
                      label={chip}
                      selected={selected.has(chip)}
                      onToggle={() => toggle(chip)}
                    />
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.freeTextGroup}>
              <Text style={[styles.groupLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                Anything else you noticed?
              </Text>
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
                placeholder="e.g. looked really dark, smelled smoky, felt rough on my tongue..."
                placeholderTextColor={colors.mutedForeground}
                value={freeText}
                onChangeText={setFreeText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {adjustmentHistory.length > 0 && (
              <View style={styles.comparisonGroup}>
                <Text style={[styles.comparisonLabel, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  The most important question: was this brew better or worse than the previous?
                </Text>
                <View style={styles.comparisonButtons}>
                  {(['worse', 'same', 'better'] as const).map((option) => {
                    const labels = { worse: '👎 Worse', same: '→ Same', better: '👍 Better' };
                    const selected = brewComparison === option;
                    return (
                      <Pressable
                        key={option}
                        style={[
                          styles.comparisonBtn,
                          {
                            backgroundColor: selected ? colors.espresso : colors.card,
                            borderColor: selected ? colors.espresso : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setBrewComparison(prev => prev === option ? null : option);
                        }}
                      >
                        <Text style={[styles.comparisonBtnText, { color: selected ? colors.cream : colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                          {labels[option]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}

        {stage === 'result' && (
          <View style={styles.resultSection}>
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.resultLabel, { color: colors.accent, fontFamily: 'DMSans_500Medium' }]}>
                Our next brew tip
              </Text>
              <Text style={[styles.resultAdvice, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                {advice}
              </Text>
              {adjustment && adjustment !== 'none' && (
                <View style={[styles.adjustmentPill, { backgroundColor: colors.espresso }]}>
                  <Text style={[styles.adjustmentText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                    → {ADJUSTMENT_LABELS[adjustment] ?? adjustment}
                  </Text>
                </View>
              )}
            </View>

            {gearItems.length > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.gearTeaser,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/gear-recommendations',
                    params: { items: JSON.stringify(gearItems) },
                  });
                }}
              >
                <View style={styles.gearTeaserLeft}>
                  <Text style={styles.gearTeaserEmojis}>
                    {gearItems.map(g => g.emoji).join(' ')}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gearTeaserTitle, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                      Your advice could be more specific
                    </Text>
                    <Text style={[styles.gearTeaserSub, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
                      Missing: {gearItems.map(g => g.missingLabel).join(', ')}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textSoft} />
              </Pressable>
            )}

            {!isPro && usesRemaining !== null && email && (
              <Text style={[styles.usesText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                {usesRemaining} dial-in{usesRemaining !== 1 ? 's' : ''} remaining this month
              </Text>
            )}

            {email && saved && (
              <View style={[styles.savedRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="check-circle" size={16} color={colors.accent} />
                <Text style={[styles.savedText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>Saved to your coffees</Text>
              </View>
            )}

            {isAnon && !saved && (
              <View style={[styles.anonPrompt, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.anonTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
                  {usesRemaining === 0
                    ? "That was your last free brew"
                    : "Save this brew and track your history"}
                </Text>
                <Text style={[styles.anonSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                  {usesRemaining === 0
                    ? "Enter your email for 10 free dial-ins a month"
                    : ""}
                </Text>
                <TextInput
                  style={[styles.anonInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
                  placeholder="Your email address"
                  placeholderTextColor={colors.mutedForeground}
                  value={saveEmail}
                  onChangeText={setSaveEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Pressable
                  style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.espresso, opacity: pressed || saving ? 0.8 : 1 }]}
                  onPress={handleSaveWithEmail}
                  disabled={saving}
                >
                  <Text style={[styles.saveBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                    {usesRemaining === 0 ? 'Get free access →' : 'Save →'}
                  </Text>
                </Pressable>
                {usesRemaining !== 0 && (
                  <Pressable onPress={() => router.push('/home')} style={styles.skipBtn}>
                    <Text style={[styles.skipBtnText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>Skip</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        {stage === 'selecting' && (
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: canSubmit ? colors.espresso : colors.muted,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleDialIn}
            disabled={!canSubmit || stage !== 'selecting'}
          >
            <Text style={[styles.nextBtnText, { color: canSubmit ? colors.cream : colors.mutedForeground, fontFamily: 'DMSans_500Medium' }]}>
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
              style={({ pressed }) => [
                styles.shareOutlineBtn,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowShareModal(true);
              }}
            >
              <Feather name="share-2" size={16} color={colors.espresso} />
              <Text style={[styles.shareOutlineBtnText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
                Share this tip
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.nextBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1, flex: 1 }]}
              onPress={() => router.push('/home')}
            >
              <Text style={[styles.nextBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>Done</Text>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 17 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  chipGroup: { gap: 10 },
  groupLabel: { fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  freeTextGroup: { gap: 10 },
  comparisonGroup: { gap: 12, paddingTop: 4 },
  comparisonLabel: { fontSize: 16, lineHeight: 22 },
  comparisonButtons: { flexDirection: 'row', gap: 10 },
  comparisonBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
  },
  comparisonBtnText: { fontSize: 14 },
  textarea: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    minHeight: 80,
  },
  resultSection: { gap: 16 },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  resultLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  resultAdvice: { fontSize: 20, lineHeight: 28 },
  adjustmentPill: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  adjustmentText: { fontSize: 14 },
  usesText: { fontSize: 14, textAlign: 'center' },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  savedText: { fontSize: 15 },
  anonPrompt: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  anonTitle: { fontSize: 18, lineHeight: 24 },
  anonSub: { fontSize: 14, marginTop: -4 },
  anonInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveBtn: {
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16 },
  skipBtn: { alignItems: 'center' },
  skipBtnText: { fontSize: 14 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 17 },
  loadingRow: {
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 16 },
  resultFooter: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  shareOutlineBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  shareOutlineBtnText: { fontSize: 15 },
  gearTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  gearTeaserLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  gearTeaserEmojis: { fontSize: 22 },
  gearTeaserTitle: { fontSize: 15 },
  gearTeaserSub: { fontSize: 13, marginTop: 2 },
});
