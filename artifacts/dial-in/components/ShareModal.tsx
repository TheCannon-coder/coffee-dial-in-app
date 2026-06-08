import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { ShareCard } from './ShareCard';

type Props = {
  visible: boolean;
  onClose: () => void;
  advice: string;
  adjustment: string;
  method: string;
  coffeeName?: string;
};

export function ShareModal({ visible, onClose, advice, adjustment, method, coffeeName }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your brew tip',
        });
      }
    } catch {
      // silent — share cancelled or failed
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Handle bar */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
          <Text style={[styles.title, { color: colors.espresso, fontFamily: 'Fraunces_500Medium' }]}>
            Share this tip
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Feather name="x" size={20} color={colors.textSoft} />
          </Pressable>
        </View>

        {/* Card preview */}
        <View style={styles.cardWrapper}>
          <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
            <ShareCard
              advice={advice}
              adjustment={adjustment}
              method={method}
              coffeeName={coffeeName}
            />
          </ViewShot>
        </View>

        <Text style={[styles.caption, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
          Share to Instagram, Stories, or anywhere you show your coffee setups.
        </Text>

        {/* Actions */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.shareBtn,
              { backgroundColor: colors.espresso, opacity: pressed || sharing ? 0.85 : 1 },
            ]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color={colors.cream} size="small" />
            ) : (
              <>
                <Feather name="share-2" size={17} color={colors.cream} />
                <Text style={[styles.shareBtnText, { color: colors.cream, fontFamily: 'DMSans_500Medium' }]}>
                  Share image
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: '100%',
    position: 'relative',
  },
  title: { fontSize: 18 },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: '50%',
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 20,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  shareBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: { fontSize: 17 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 16 },
});
