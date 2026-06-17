import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'Grind finer',
  grind_coarser: 'Grind coarser',
  more_coffee: 'Use more coffee',
  less_coffee: 'Use less coffee',
  steep_longer: 'Steep longer',
  steep_shorter: 'Steep shorter',
  none: 'Leave it as-is',
};

interface TastingResultProps {
  advice: string;
  adjustment: string;
  isPro: boolean;
  usesRemaining: number | null;
  email: string | null;
  saved: boolean;
  saveEmail: string;
  onSaveEmailChange: (text: string) => void;
  onSaveWithEmail: () => void;
  saving: boolean;
  onShare: () => void;
}

export function TastingResult({
  advice,
  adjustment,
  isPro,
  usesRemaining,
  email,
  saved,
  saveEmail,
  onSaveEmailChange,
  onSaveWithEmail,
  saving,
  onShare,
}: TastingResultProps) {
  const colors = useColors();
  const isAnon = !email;

  return (
    <View style={styles.container}>
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

      {!isPro && usesRemaining !== null && email && (
        <Text style={[styles.usesText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          {usesRemaining} dial-in{usesRemaining !== 1 ? 's' : ''} remaining this month
        </Text>
      )}

      {email && saved && (
        <View style={[styles.savedRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="check-circle" size={16} color={colors.accent} />
          <Text style={[styles.savedText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
            Saved to your coffees
          </Text>
        </View>
      )}

      {isAnon && !saved && (
        <View style={[styles.anonPrompt, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.anonTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            {usesRemaining === 0
              ? 'That was your last free brew'
              : 'Save this brew and track your history'}
          </Text>
          {usesRemaining === 0 && (
            <Text style={[styles.anonSub, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Enter your email for 10 free dial-ins a month
            </Text>
          )}
          <TextInput
            style={[styles.anonInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
            placeholder="Your email address"
            placeholderTextColor={colors.mutedForeground}
            value={saveEmail}
            onChangeText={onSaveEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.espresso, opacity: pressed || saving ? 0.8 : 1 }]}
            onPress={onSaveWithEmail}
            disabled={saving}
          >
            <Text style={[styles.saveBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
              {usesRemaining === 0 ? 'Get free access →' : 'Save →'}
            </Text>
          </Pressable>
          {usesRemaining !== 0 && (
            <Pressable onPress={() => router.push('/home')} style={styles.skipBtn}>
              <Text style={[styles.skipBtnText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
                Skip
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
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
});
