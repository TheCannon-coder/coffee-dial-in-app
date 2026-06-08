import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { ShareCard } from './ShareCard';

const ADJUSTMENT_LABELS: Record<string, string> = {
  grind_finer: 'Grind finer',
  grind_coarser: 'Grind coarser',
  more_coffee: 'Use more coffee',
  less_coffee: 'Use less coffee',
  steep_longer: 'Steep longer',
  steep_shorter: 'Steep shorter',
  none: '',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  advice: string;
  adjustment: string;
  method: string;
  coffeeName?: string;
};

type PlatformId = 'instagram' | 'tiktok' | 'facebook' | 'x' | 'reddit' | 'more';

interface PlatformConfig {
  id: PlatformId;
  label: string;
  color: string;
  iconLib: 'FontAwesome5' | 'Feather';
  iconName: string;
}

const PLATFORMS: PlatformConfig[] = [
  { id: 'instagram', label: 'Instagram', color: '#C13584', iconLib: 'FontAwesome5', iconName: 'instagram' },
  { id: 'tiktok',   label: 'TikTok',    color: '#010101', iconLib: 'FontAwesome5', iconName: 'tiktok' },
  { id: 'facebook', label: 'Facebook',  color: '#1877F2', iconLib: 'FontAwesome5', iconName: 'facebook' },
  { id: 'x',        label: 'X',         color: '#000000', iconLib: 'FontAwesome5', iconName: 'x-twitter' },
  { id: 'reddit',   label: 'Reddit',    color: '#FF4500', iconLib: 'FontAwesome5', iconName: 'reddit-alien' },
  { id: 'more',     label: 'More',      color: '#8A7A6A', iconLib: 'Feather',      iconName: 'more-horizontal' },
];

export function ShareModal({ visible, onClose, advice, adjustment, method, coffeeName }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardRef = useRef<any>(null);
  const [busy, setBusy] = useState<PlatformId | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  /** Capture the card as a temp PNG file. */
  async function capture(): Promise<string> {
    return captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
  }

  /** Save image to the camera roll, requesting permission first. Returns true on success. */
  async function saveToPhotos(uri: string): Promise<boolean> {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return false;
    await MediaLibrary.saveToLibraryAsync(uri);
    return true;
  }

  /** Build the share text used for text-based platforms. */
  function buildShareText(): string {
    const adj = ADJUSTMENT_LABELS[adjustment];
    const parts = [`"${advice}"`];
    if (adj) parts.push(`→ ${adj}`);
    parts.push('— Dial In coffee coach · coffeebrew.coach');
    return parts.join(' ');
  }

  async function handlePlatform(platform: PlatformId) {
    setBusy(platform);
    setSavedMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      switch (platform) {
        case 'instagram': {
          const uri = await capture();
          const saved = await saveToPhotos(uri);
          if (!saved) { setSavedMsg('Allow Photos access to save the card.'); break; }
          const canOpen = await Linking.canOpenURL('instagram://');
          if (canOpen) {
            await Linking.openURL('instagram://camera');
          } else {
            setSavedMsg('Saved to Photos — open Instagram and share from your gallery!');
          }
          break;
        }
        case 'tiktok': {
          const uri = await capture();
          const saved = await saveToPhotos(uri);
          if (!saved) { setSavedMsg('Allow Photos access to save the card.'); break; }
          const canOpen = await Linking.canOpenURL('tiktok://');
          if (canOpen) {
            await Linking.openURL('tiktok://');
          } else {
            setSavedMsg('Saved to Photos — open TikTok and share from your gallery!');
          }
          break;
        }
        case 'facebook': {
          const uri = await capture();
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share to Facebook' });
          }
          break;
        }
        case 'x': {
          const text = buildShareText() + ' #DialIn #CoffeeCoach';
          // Try native Twitter app first, fall back to web intent
          const twitterUrl = `twitter://post?message=${encodeURIComponent(text)}`;
          const webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
          const canOpen = await Linking.canOpenURL(twitterUrl);
          await Linking.openURL(canOpen ? twitterUrl : webUrl);
          break;
        }
        case 'reddit': {
          const title = encodeURIComponent(`My coffee AI coach said: "${advice}"`);
          const body = encodeURIComponent(
            `Just got this tip from Dial In (coffeebrew.coach):\n\n"${advice}"\n\n${
              ADJUSTMENT_LABELS[adjustment] ? `Adjustment: ${ADJUSTMENT_LABELS[adjustment]}` : ''
            }\n\nBrewing method: ${method}`
          );
          const redditUrl = `reddit://submit?title=${title}&text=${body}`;
          const webUrl = `https://www.reddit.com/submit?title=${title}&text=${body}`;
          const canOpen = await Linking.canOpenURL(redditUrl);
          await Linking.openURL(canOpen ? redditUrl : webUrl);
          break;
        }
        case 'more':
        default: {
          const uri = await capture();
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your brew tip' });
          }
          break;
        }
      }
    } catch {
      // silent — user cancelled or app not installed
    } finally {
      setBusy(null);
    }
  }

  function renderIcon(config: PlatformConfig, size: number, color: string) {
    if (config.iconLib === 'FontAwesome5') {
      return <FontAwesome5 name={config.iconName} size={size} color={color} solid={false} />;
    }
    return <Feather name={config.iconName as any} size={size} color={color} />;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Handle */}
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

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Saved-to-photos feedback */}
          {savedMsg ? (
            <View style={[styles.savedBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="check-circle" size={14} color={colors.espresso} />
              <Text style={[styles.savedText, { color: colors.espresso, fontFamily: 'DMSans_400Regular' }]}>
                {savedMsg}
              </Text>
            </View>
          ) : (
            <Text style={[styles.caption, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
              For image-based apps the card is saved to your Photos first.
            </Text>
          )}

          {/* Platform grid */}
          <View style={styles.platformGrid}>
            {PLATFORMS.map((p) => {
              const isLoading = busy === p.id;
              return (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [
                    styles.platformBtn,
                    { opacity: (pressed || (busy !== null && !isLoading)) ? 0.55 : 1 },
                  ]}
                  onPress={() => handlePlatform(p.id)}
                  disabled={busy !== null}
                >
                  <View style={[styles.platformIcon, { backgroundColor: p.color + '18' }]}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color={p.color} />
                    ) : (
                      renderIcon(p, 22, p.color)
                    )}
                  </View>
                  <Text style={[styles.platformLabel, { color: colors.textSoft, fontFamily: 'DMSans_400Regular' }]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Save to camera roll shortcut */}
          <Pressable
            style={({ pressed }) => [styles.saveCameraBtn, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
            onPress={async () => {
              setBusy('more');
              try {
                const uri = await capture();
                const saved = await saveToPhotos(uri);
                setSavedMsg(saved ? 'Card saved to your Photos!' : 'Allow Photos access to save.');
              } catch {
                // silent
              } finally {
                setBusy(null);
              }
            }}
            disabled={busy !== null}
          >
            <Feather name="download" size={15} color={colors.espresso} />
            <Text style={[styles.saveCameraText, { color: colors.espresso, fontFamily: 'DMSans_500Medium' }]}>
              Save card to Photos
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2, marginTop: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    width: '100%',
    position: 'relative',
  },
  title: { fontSize: 18 },
  closeBtn: { position: 'absolute', right: 20, top: Platform.OS === 'ios' ? '30%' : '50%' },
  scroll: { alignItems: 'center', paddingHorizontal: 20, gap: 20, width: '100%' },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  caption: { fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 16 },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  savedText: { fontSize: 13, flex: 1, lineHeight: 18 },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  platformBtn: {
    alignItems: 'center',
    gap: 6,
    width: 76,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformLabel: { fontSize: 12 },
  saveCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  saveCameraText: { fontSize: 14 },
});
