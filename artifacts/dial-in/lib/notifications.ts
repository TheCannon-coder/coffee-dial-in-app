import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export async function getPermissionStatus(): Promise<NotificationPermission> {
  if (!isNative) return 'undetermined';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as NotificationPermission;
  } catch {
    return 'undetermined';
  }
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isNative) return 'denied';
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Coffee Brew Coach',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status as NotificationPermission;
  } catch {
    return 'denied';
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (!isNative) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

export async function scheduleReminders(): Promise<void> {
  if (!isNative) return;
  await cancelAllNotifications();

  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your free dial-ins reset today ☕',
        body: 'Ready to dial in your next cup? 10 new coaching sessions are waiting.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: 1,
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to brew? ☕',
        body: 'Use your free dial-ins before the month ends — tell us how your cup tastes.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 7,
        hour: 9,
        minute: 30,
        repeats: true,
      },
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Know a fellow coffee nerd? 🎁',
        body: 'Share your Coffee Brew Coach link — you both get 2 extra free brews this month.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 4,
        hour: 11,
        minute: 0,
        repeats: true,
      },
    });
  } catch {}
}
