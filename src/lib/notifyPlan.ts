import { AppData } from '../types';
import { dateAt, toDateStr } from './date';
import { occurrencesInRange } from './schedule';

export const START_ALERT_MINUTES = 10;
/** 앞으로 며칠치 알림을 미리 예약할지. 앱을 열 때마다 다시 채운다. */
export const SCHEDULE_AHEAD_DAYS = 14;

export type PlannedNotification = {
  id: string;
  at: Date;
  title: string;
  body: string;
  planId: string;
  date: string;
  kind: 'start' | 'end';
};

/**
 * 예약해야 할 알림 목록.
 * - 시작 알림: 시작 10분 전. 이미 공부를 시작했거나(기록이 있으면) 보내지 않는다.
 * - 종료 알림: 종료 시각. 이미 완료했거나 '못함'으로 기록했으면 보내지 않는다.
 */
export function planNotifications(data: AppData, now: Date): PlannedNotification[] {
  const result: PlannedNotification[] = [];
  for (const occ of occurrencesInRange(data, toDateStr(now), SCHEDULE_AHEAD_DAYS)) {
    if (!occ.plan.notify) continue;
    const { plan, subject, date, record } = occ;
    const goal = plan.goal ? ` (${plan.goal})` : '';

    const startAt = new Date(dateAt(date, plan.startTime).getTime() - START_ALERT_MINUTES * 60000);
    if (!record && startAt > now) {
      result.push({
        id: `${plan.id}_${date}_start`,
        at: startAt,
        title: `📚 10분 뒤 ${subject.name} 공부 시간이야!`,
        body: `${plan.startTime}~${plan.endTime}${goal} 준비하고 [공부 시작]을 눌러줘.`,
        planId: plan.id,
        date,
        kind: 'start',
      });
    }

    const endAt = dateAt(date, plan.endTime);
    const finished = record?.status === 'done' || record?.status === 'skipped';
    if (!finished && endAt > now) {
      result.push({
        id: `${plan.id}_${date}_end`,
        at: endAt,
        title: `⏰ ${subject.name} 공부 시간이 다 됐어!`,
        body: '수고했어! [공부 완료]를 누르고 공부한 내용을 적어줘.',
        planId: plan.id,
        date,
        kind: 'end',
      });
    }
  }
  return result;
}
