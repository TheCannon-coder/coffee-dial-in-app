import { useCallback, useEffect, useState } from 'react';
import { getItem, setItem, KEYS } from '@/lib/storage';
import {
  getPermissionStatus,
  requestPermission,
  scheduleReminders,
  cancelAllNotifications,
  scheduleDailyReminder,
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  type NotificationPermission,
} from '@/lib/notifications';

export function useNotifications() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [reminderHour, setReminderHour] = useState<number>(DEFAULT_REMINDER_HOUR);
  const [reminderMinute, setReminderMinute] = useState<number>(DEFAULT_REMINDER_MINUTE);

  useEffect(() => {
    async function init() {
      const [stored, status, hour, minute] = await Promise.all([
        getItem<boolean>(KEYS.NOTIFICATIONS_ENABLED),
        getPermissionStatus(),
        getItem<number>(KEYS.REMINDER_HOUR),
        getItem<number>(KEYS.REMINDER_MINUTE),
      ]);
      setPermission(status);
      setEnabled(stored ?? false);
      setReminderHour(hour ?? DEFAULT_REMINDER_HOUR);
      setReminderMinute(minute ?? DEFAULT_REMINDER_MINUTE);
    }
    init();
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    const status = await requestPermission();
    setPermission(status);
    if (status === 'granted') {
      const h = reminderHour;
      const m = reminderMinute;
      await scheduleReminders(h, m);
      await setItem(KEYS.NOTIFICATIONS_ENABLED, true);
      setEnabled(true);
      return true;
    }
    return false;
  }, [reminderHour, reminderMinute]);

  const disable = useCallback(async () => {
    await cancelAllNotifications();
    await setItem(KEYS.NOTIFICATIONS_ENABLED, false);
    setEnabled(false);
  }, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      await disable();
    } else {
      await enable();
    }
  }, [enabled, enable, disable]);

  const setReminderTime = useCallback(async (hour: number, minute: number) => {
    setReminderHour(hour);
    setReminderMinute(minute);
    await setItem(KEYS.REMINDER_HOUR, hour);
    await setItem(KEYS.REMINDER_MINUTE, minute);
    if (enabled) {
      await scheduleDailyReminder(hour, minute);
    }
  }, [enabled]);

  return { enabled, permission, enable, disable, toggle, reminderHour, reminderMinute, setReminderTime };
}
