import { useCallback, useEffect, useState } from 'react';
import { getItem, setItem, KEYS } from '@/lib/storage';
import {
  getPermissionStatus,
  requestPermission,
  scheduleReminders,
  cancelAllNotifications,
  type NotificationPermission,
} from '@/lib/notifications';

export function useNotifications() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    async function init() {
      const [stored, status] = await Promise.all([
        getItem<boolean>(KEYS.NOTIFICATIONS_ENABLED),
        getPermissionStatus(),
      ]);
      setPermission(status);
      setEnabled(stored ?? false);
    }
    init();
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    const status = await requestPermission();
    setPermission(status);
    if (status === 'granted') {
      await scheduleReminders();
      await setItem(KEYS.NOTIFICATIONS_ENABLED, true);
      setEnabled(true);
      return true;
    }
    return false;
  }, []);

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

  return { enabled, permission, enable, disable, toggle };
}
