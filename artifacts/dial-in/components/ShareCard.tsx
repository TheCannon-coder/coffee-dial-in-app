import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'Grind finer',
  grind_coarser: 'Grind coarser',
  more_coffee: 'Use more coffee',
  less_coffee: 'Use less coffee',
  steep_longer: 'Steep longer',
  steep_shorter: 'Steep shorter',
  none: 'Leave it as-is',
};

type Props = {
  advice: string;
  adjustment: string;
  method: string;
  coffeeName?: string;
};

/**
 * The shareable card — captured by ViewShot and sent to the native share sheet.
 * Fixed 1:1 square at 360×360 dp (renders at 1080×1080px on a 3× device).
 */
export function ShareCard({ advice, adjustment, method, coffeeName }: Props) {
  const adjustmentLabel = ADJUSTMENT_LABELS[adjustment];

  return (
    <View style={styles.card}>
      {/* Subtle decorative rings */}
      <View style={styles.ringOuter} />
      <View style={styles.ringInner} />

      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.methodPill}>
          <Text style={styles.methodText}>{method}</Text>
        </View>
        {coffeeName ? (
          <Text style={styles.coffeeLabel} numberOfLines={1}>
            {coffeeName}
          </Text>
        ) : null}
      </View>

      {/* Attribution */}
      <View style={styles.middle}>
        <Text style={styles.coachLabel}>My brew coach said</Text>
        <Text style={styles.advice}>"{advice}"</Text>
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        {adjustmentLabel && adjustment !== 'none' ? (
          <View style={styles.adjustmentPill}>
            <Text style={styles.adjustmentText}>→ {adjustmentLabel}</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.brandRow}>
          <Text style={styles.brandStar}>✦</Text>
          <Text style={styles.brandName}>Dial In</Text>
        </View>
      </View>
    </View>
  );
}

const ESPRESSO = '#2C1A0E';
const CREAM = '#FAF7F2';
const MUTED = '#A89080';
const DIM = '#5A3A20';

const styles = StyleSheet.create({
  card: {
    width: 360,
    height: 360,
    backgroundColor: ESPRESSO,
    borderRadius: 24,
    padding: 28,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  ringOuter: {
    position: 'absolute',
    bottom: -70,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  ringInner: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  methodText: {
    fontSize: 12,
    color: MUTED,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  coffeeLabel: {
    fontSize: 12,
    color: DIM,
    fontFamily: 'DMSans_400Regular',
    fontStyle: 'italic',
    maxWidth: 160,
  },
  middle: {
    gap: 10,
  },
  coachLabel: {
    fontSize: 11,
    color: DIM,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  advice: {
    fontSize: 18,
    lineHeight: 27,
    color: CREAM,
    fontFamily: 'Fraunces_500Medium',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustmentPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adjustmentText: {
    fontSize: 12,
    color: MUTED,
    fontFamily: 'DMSans_400Regular',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandStar: {
    fontSize: 13,
    color: DIM,
  },
  brandName: {
    fontSize: 12,
    color: DIM,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
});
