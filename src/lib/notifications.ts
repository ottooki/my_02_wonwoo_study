import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { AppData } from '../types';
import { planNotifications } from './notifyPlan';

const CHANNEL_ID = 'study';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '공부 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      sound: 'default',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** 정확한 시각 알림 권한 (안드로이드 12+). 없으면 몇 분 늦게 올 수 있다. */
export async function exactAlarmGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return (await Notifications.getExactAlarmPermissionsAsync()).granted;
  } catch {
    return true;
  }
}

export async function requestExactAlarm(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.requestExactAlarmPermissionsAsync();
  } catch {
    // 권한을 선언하지 않은 빌드에서는 무시
  }
}

let syncing: Promise<void> = Promise.resolve();

/** 예약된 알림을 모두 지우고 현재 데이터 기준으로 다시 예약한다. */
export function syncNotifications(data: AppData): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  syncing = syncing.then(async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const n of planNotifications(data, new Date())) {
        await Notifications.scheduleNotificationAsync({
          identifier: n.id,
          content: {
            title: n.title,
            body: n.body,
            data: { planId: n.planId, date: n.date, kind: n.kind },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: n.at,
            channelId: CHANNEL_ID,
          },
        });
      }
    } catch (e) {
      console.warn('알림 예약 실패', e);
    }
  });
  return syncing;
}

export async function sendTestNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: { title: '🔔 알림 테스트', body: '알림이 잘 와요!', sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}

/** 알림을 눌러 앱이 열리면 그 일정의 planId, date 를 알려준다. */
export function useNotificationTap(onTap: (planId: string, date: string) => void) {
  const cb = useRef(onTap);
  cb.current = onTap;
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handle = (r: Notifications.NotificationResponse | null) => {
      const d = r?.notification.request.content.data as { planId?: string; date?: string } | undefined;
      if (!d?.planId || !d.date) return;
      cb.current(d.planId, d.date);
      // 다음에 앱을 열 때 같은 알림으로 다시 열리지 않도록
      Notifications.clearLastNotificationResponse();
    };
    handle(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, []);
}
