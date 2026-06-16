import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Feather } from '@expo/vector-icons';
import { type Badge } from '@/lib/achievements';

type Props = {
  badge: Badge | null;
  onClose: () => void;
};

export function BadgeDetailModal({ badge, onClose }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);

  if (!badge) return null;

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: badge ? `I earned the ${badge.title} badge!` : 'My badge',
        });
      } else if (Platform.OS !== 'web') {
        const MediaLibrary = await import('expo-media-library');
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
        }
      }
    } catch {}
    setSharing(false);
  }

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.center} pointerEvents="box-none">
        <ViewShot ref={cardRef} style={styles.card}>
          <Text style={styles.earned}>BADGE EARNED</Text>

          <Text style={styles.emoji}>{badge.emoji}</Text>

          <Text style={styles.title}>{badge.title}</Text>
          <Text style={styles.celebration}>{badge.celebration}</Text>
          <Text style={styles.description}>{badge.description}</Text>

          <Text style={styles.branding}>Dial In — Coffee Coach</Text>
        </ViewShot>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#2C1A0E" />
            ) : (
              <>
                <Feather name="share-2" size={16} color="#2C1A0E" />
                <Text style={styles.shareBtnText}>Share</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 10, 5, 0.82)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  card: {
    width: '100%',
    backgroundColor: '#2C1A0E',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 8,
  },
  earned: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#A89080',
    fontFamily: 'DMSans_500Medium',
    marginBottom: 6,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    color: '#FAF7F2',
    fontFamily: 'Fraunces_500Medium',
  },
  celebration: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#C8A97A',
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    color: '#A89080',
    fontFamily: 'DMSans_400Regular',
    marginBottom: 4,
  },
  branding: {
    fontSize: 11,
    color: '#6B5040',
    fontFamily: 'DMSans_400Regular',
    marginTop: 10,
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAF7F2',
    borderRadius: 100,
    paddingVertical: 15,
  },
  shareBtnText: {
    fontSize: 17,
    color: '#2C1A0E',
    fontFamily: 'DMSans_500Medium',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 100,
    borderColor: 'rgba(250,247,242,0.2)',
  },
  closeBtnText: {
    fontSize: 15,
    color: '#FAF7F2',
    fontFamily: 'DMSans_400Regular',
  },
});
