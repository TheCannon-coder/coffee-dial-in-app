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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';
import { sendSupportMessage } from '@/lib/api';

export default function ContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email: accountEmail } = useUser();

  const [email, setEmail] = useState(accountEmail ?? '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    if (message.trim().length < 5) {
      setError('Tell us a little more so we can help.');
      return;
    }
    setError('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await sendSupportMessage(message.trim(), email.trim() || undefined);
      if (result.error) {
        setError(result.error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSent(true);
      }
    } catch {
      setError("Couldn't send right now — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.espresso} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Contact us
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {sent ? (
          <View style={styles.sentWrap}>
            <View style={[styles.sentIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="check-circle" size={30} color={colors.accent} />
            </View>
            <Text style={[styles.sentTitle, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
              Message sent
            </Text>
            <Text style={[styles.sentBody, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Thanks for reaching out — a real human (the one who built this) reads every message and will get back to you by email.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.espresso, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.sendBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.lede, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              Something broken? An idea? A coffee question? Send it over — replies come straight from the founder.
            </Text>

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              YOUR EMAIL (FOR THE REPLY)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular' }]}>
              MESSAGE
            </Text>
            <TextInput
              style={[styles.input, styles.messageInput, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border, color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.mutedForeground}
              value={message}
              onChangeText={(t) => { setMessage(t); setError(''); }}
              multiline
              textAlignVertical="top"
            />

            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'DMSans_400Regular' }]}>
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSend}
              disabled={sending}
              style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.espresso, opacity: pressed || sending ? 0.8 : 1 }]}
            >
              {sending ? (
                <ActivityIndicator color={colors.cream} size="small" />
              ) : (
                <Text style={[styles.sendBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                  Send message →
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17 },
  lede: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  label: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 18,
  },
  messageInput: { minHeight: 150, paddingTop: 14 },
  errorText: { fontSize: 13, marginBottom: 12 },
  sendBtn: {
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  sendBtnText: { fontSize: 15 },
  sentWrap: { alignItems: 'center', gap: 12, paddingTop: 40 },
  sentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTitle: { fontSize: 22 },
  sentBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 300, marginBottom: 12 },
});
