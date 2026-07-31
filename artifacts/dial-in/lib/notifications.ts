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

export const DEFAULT_REMINDER_HOUR = 8;
export const DEFAULT_REMINDER_MINUTE = 30;

const DAILY_REMINDER_ID = 'dialin_daily_morning';

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (!isNative) return;
  const status = await getPermissionStatus();
  if (status !== 'granted') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'Morning coffee time ☕',
        body: 'How did yesterday\'s brew go? Let\'s dial in today\'s cup.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch {}
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isNative) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  } catch {}
}

export async function scheduleReminders(hour = DEFAULT_REMINDER_HOUR, minute = DEFAULT_REMINDER_MINUTE): Promise<void> {
  if (!isNative) return;
  await cancelAllNotifications();

  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  try {
    await scheduleDailyReminder(hour, minute);

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
      },
    });
  } catch {}
}

/**
 * Week-1 nudge series — three gentle check-ins after the user's FIRST brew,
 * timed for when new users typically drift away. Copy implies progress
 * without promising a specific dial-in count (we can't know how many brews
 * a coffee will take). Scheduled once per install; guarded by the caller.
 */
export async function scheduleWeekOneNudges(): Promise<void> {
  if (!isNative) return;
  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  const DAY = 24 * 60 * 60;
  const nudges: { seconds: number; title: string; body: string }[] = [
    {
      seconds: 1 * DAY,
      title: 'Your perfect brew could be today ☕',
      body: "One small tweak at a time — let's see how today's cup improves.",
    },
    {
      seconds: 3 * DAY,
      title: 'Every brew teaches you something',
      body: "Ready to make today's cup better than the last?",
    },
    {
      seconds: 7 * DAY,
      title: 'A week of better coffee ✨',
      body: 'The tweaks are adding up. Brew today and taste the difference.',
    },
  ];

  try {
    for (const n of nudges) {
      await Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: n.seconds,
        },
      });
    }
  } catch {}
}
