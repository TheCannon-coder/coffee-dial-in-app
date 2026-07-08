import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Colors = ReturnType<typeof import('@/hooks/useColors').useColors>;

// ── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'When does my first payout arrive?',
    a: 'Every commission has a 30-day holding period after the referred subscriber pays. This protects against refunds and fraud. Once the hold clears, your earnings enter the next monthly payout batch and are transferred to your bank within a few business days.',
  },
  {
    q: 'What happens if a referred subscriber cancels?',
    a: 'For monthly plans, no further commissions are generated after cancellation — you only earn while they stay subscribed. For annual and lifetime plans that are already in their instalment schedule, cancellations stop any remaining instalments immediately.',
  },
  {
    q: 'Why do annual and lifetime plans pay in instalments instead of a lump sum?',
    a: 'Spreading payments over 12 months (annual) or 6 months (lifetime) protects both parties. If a subscriber gets a refund in the first 30 days, we can cancel remaining instalments rather than clawing back a lump sum that\'s already been paid.',
  },
  {
    q: 'Can my commission rate change?',
    a: 'Your rate is locked at the moment a subscriber signs up through your link. Future rate changes never affect existing referrals — only new ones. This is why you might see different rates on different conversions.',
  },
  {
    q: 'How do I move up a commission tier?',
    a: 'Tiers are reviewed manually based on your referred subscriber count and engagement. Reach out if you think you\'re ready for a review — there\'s no automatic threshold for now.',
  },
  {
    q: 'What is the 30-day referral hold?',
    a: 'Apple and Stripe both offer a 30-day refund window. We hold commissions for the same period so we\'re not paying out on subscriptions that get immediately refunded. After 30 days, the commission unlocks and enters the next batch.',
  },
  {
    q: 'When are payout batches processed?',
    a: 'Batches are compiled on the 1st of each month and transferred by the end of that same month. If you don\'t see a payment, check that your Stripe Connect account is fully set up — payouts can\'t go out until onboarding is complete.',
  },
  {
    q: 'Do I earn commissions on lifetime purchases?',
    a: 'Yes. Lifetime plans pay out over 6 monthly instalments rather than a single payment. If the subscriber requests a refund within 30 days, all remaining instalments are cancelled.',
  },
  {
    q: 'What taxes do I owe on affiliate income?',
    a: 'You\'re responsible for reporting affiliate earnings as income in your jurisdiction. US affiliates who earn over $600 in a calendar year will receive a 1099-NEC from us. Canadian affiliates will receive a T4A slip. Tax compliance requirements differ — consult a tax professional for your situation.',
  },
  {
    q: 'Why are payouts only available in the US and Canada?',
    a: 'Affiliate payouts require tax form collection and compliance work for each jurisdiction. We\'re starting with the US and Canada where that infrastructure is in place, and will expand to other countries in a future update.',
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: Colors }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
      {title}
    </Text>
  );
}

function InfoCard({ children, colors }: { children: React.ReactNode; colors: Colors }) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value, colors, accent }: {
  icon: string;
  label: string;
  value: string;
  colors: Colors;
  accent?: boolean;
}) {
  return (
    <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
      <Feather name={icon as any} size={14} color={accent ? colors.accent : colors.espresso} style={styles.infoIcon} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
        {value}
      </Text>
    </View>
  );
}

function TrackCard({ title, icon, badge, children, colors, highlight }: {
  title: string;
  icon: string;
  badge?: string;
  children: React.ReactNode;
  colors: Colors;
  highlight?: boolean;
}) {
  return (
    <View style={[
      styles.trackCard,
      {
        backgroundColor: highlight ? colors.espresso : colors.card,
        borderColor: highlight ? colors.espresso : colors.border,
      },
    ]}>
      <View style={styles.trackHeader}>
        <Feather name={icon as any} size={16} color={highlight ? colors.cream : colors.accent} />
        <Text style={[
          styles.trackTitle,
          { color: highlight ? colors.cream : colors.espresso, fontFamily: 'Fraunces_500Medium' },
        ]}>
          {title}
        </Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: highlight ? 'rgba(250,247,242,0.15)' : colors.secondary }]}>
            <Text style={[styles.badgeText, { color: highlight ? colors.cream : colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
              {badge}
            </Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function BulletRow({ text, colors, highlight }: { text: string; colors: Colors; highlight?: boolean }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bullet, { backgroundColor: highlight ? 'rgba(250,247,242,0.4)' : colors.accent }]} />
      <Text style={[
        styles.bulletText,
        { color: highlight ? 'rgba(250,247,242,0.8)' : colors.mutedForeground, fontFamily: 'DMSans_400Regular' },
      ]}>
        {text}
      </Text>
    </View>
  );
}

function FaqItem({ q, a, colors }: { q: string; a: string; colors: Colors }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.faqItem, { borderColor: colors.border }]}>
      <Pressable
        style={styles.faqQuestion}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={[styles.faqQ, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
          {q}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
      </Pressable>
      {open && (
        <Text style={[styles.faqA, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          {a}
        </Text>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AffiliatePayoutsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <Pressable
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="arrow-left" size={22} color={colors.espresso} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
          How payouts work
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Everything you need to know about earning and getting paid — no surprises.
        </Text>

        {/* ── How to earn ── */}
        <SectionHeader title="How it works" colors={colors} />

        <TrackCard title="Share your link" icon="trending-up" badge="Affiliate" colors={colors} highlight>
          <BulletRow
            text="Share your unique referral link. When someone signs up for Pro, you earn a monthly cash commission."
            colors={colors}
            highlight
          />
          <BulletRow
            text="Commissions are paid monthly via Stripe to your connected bank account."
            colors={colors}
            highlight
          />
          <BulletRow
            text="Earn more as you grow — Silver, Gold, and Platinum tiers unlock higher rates."
            colors={colors}
            highlight
          />
          <Text style={[styles.trackNote, { color: 'rgba(250,247,242,0.5)', fontFamily: 'DMSans_400Regular' }]}>
            Currently available to US and Canada residents only.
          </Text>
        </TrackCard>

        {/* ── Commission rates ── */}
        <SectionHeader title="Commission by plan type" colors={colors} />
        <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Your commission rate is locked at the moment a subscriber signs up through your link. Future rate changes don't affect existing referrals.
        </Text>

        <InfoCard colors={colors}>
          <InfoRow icon="refresh-cw" label="Monthly plan" value="Rate per active subscriber/month" colors={colors} accent />
          <InfoRow icon="calendar" label="Annual plan" value="Rate paid over 12 monthly instalments" colors={colors} accent />
          <InfoRow icon="zap" label="Lifetime plan" value="Rate paid over 6 monthly instalments" colors={colors} accent />
        </InfoCard>

        <Text style={[styles.noteText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Standard tier rate is shown in your dashboard. Rates increase with Silver, Gold, and Platinum tiers as your subscriber count grows.
        </Text>

        {/* ── Payout timeline ── */}
        <SectionHeader title="Payout timeline" colors={colors} />

        <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TimelineStep
            step="1"
            title="Subscriber pays"
            body="A referred user subscribes to Pro through your link."
            colors={colors}
          />
          <TimelineStep
            step="2"
            title="30-day hold"
            body="Commission enters a 30-day holding period — Apple and Stripe both offer a 30-day refund window, so we wait for it to close before paying out."
            colors={colors}
          />
          <TimelineStep
            step="3"
            title="Monthly batch"
            body="On the 1st of each month, cleared commissions are compiled into a payout batch."
            colors={colors}
          />
          <TimelineStep
            step="4"
            title="Transfer sent"
            body="Stripe sends the batch to your connected bank account within a few business days."
            colors={colors}
            last
          />
        </View>

        {/* ── Instalment schedule ── */}
        <SectionHeader title="Annual & lifetime instalments" colors={colors} />
        <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Instead of a single large payment, annual and lifetime commissions are split into monthly instalments. This protects both you and us — if a subscriber gets an early refund, we cancel remaining payments rather than clawing back money already paid.
        </Text>

        <InfoCard colors={colors}>
          <InfoRow icon="calendar" label="Annual plan" value="12 monthly instalments" colors={colors} />
          <InfoRow icon="zap" label="Lifetime plan" value="6 monthly instalments" colors={colors} />
          <InfoRow icon="alert-circle" label="Refund within 30 days" value="All instalments cancelled" colors={colors} />
          <InfoRow icon="check-circle" label="Refund after 30 days" value="Remaining instalments continue" colors={colors} />
        </InfoCard>

        {/* ── Monthly vs recurring ── */}
        <SectionHeader title="Monthly subscribers" colors={colors} />
        <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          Monthly plans don't use instalments. Instead, you earn your rate every time that subscriber renews — as long as they stay subscribed. If they cancel, no further commissions are generated. If they resubscribe later, a new conversion isn't created; only new signups through your link generate commissions.
        </Text>

        {/* ── Tax & compliance ── */}
        <SectionHeader title="Tax & compliance" colors={colors} />
        <InfoCard colors={colors}>
          <InfoRow icon="file-text" label="US affiliates over $600/year" value="1099-NEC issued" colors={colors} />
          <InfoRow icon="file-text" label="Canadian affiliates" value="T4A slip issued" colors={colors} />
          <InfoRow icon="globe" label="Other countries" value="Coming soon" colors={colors} />
        </InfoCard>
        <Text style={[styles.noteText, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          You're responsible for reporting affiliate income in your jurisdiction. Stripe Connect collects your tax information (W-9 for US, W-8BEN for non-US) during onboarding.
        </Text>

        {/* ── FTC disclosure ── */}
        <View style={[styles.disclosureBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.espresso} />
          <Text style={[styles.disclosureText, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
            FTC requirement: you must clearly disclose your affiliate relationship whenever you promote Coffee Brew Coach. For example: "I earn a commission if you subscribe through my link." Failure to disclose may result in removal from the program.
          </Text>
        </View>

        {/* ── FAQ ── */}
        <SectionHeader title="Common questions" colors={colors} />
        <View style={[styles.faqContainer, { borderColor: colors.border }]}>
          {FAQS.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} colors={colors} />
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

function TimelineStep({ step, title, body, colors, last }: {
  step: string;
  title: string;
  body: string;
  colors: Colors;
  last?: boolean;
}) {
  return (
    <View style={styles.timelineStep}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineCircle, { backgroundColor: colors.espresso }]}>
          <Text style={[styles.timelineNum, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
            {step}
          </Text>
        </View>
        {!last && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineTitle, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
          {title}
        </Text>
        <Text style={[styles.timelineBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
          {body}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
  },
  topRow: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 18,
    marginBottom: 12,
    marginTop: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 24,
    marginTop: 6,
  },
  trackCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 0,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trackTitle: {
    fontSize: 16,
    flex: 1,
  },
  badge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  trackNote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  infoIcon: {
    width: 18,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    textAlign: 'right',
    maxWidth: '45%',
  },
  timelineCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 28,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNum: {
    fontSize: 13,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 14,
    marginBottom: 3,
  },
  timelineBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  disclosureBox: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 28,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  disclosureText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  faqContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  faqItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  faqQ: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  faqA: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 13,
    lineHeight: 20,
  },
});
