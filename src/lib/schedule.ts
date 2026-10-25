import { AppData, Occurrence, Plan, StudyRecord } from '../types';
import { addDays, toMinutes, weekdayOf } from './date';

export const recordKey = (planId: string, date: string) => `${planId}_${date}`;

export function planOccursOn(plan: Plan, date: string): boolean {
  return (
    date >= plan.startDate &&
    date <= plan.endDate &&
    plan.weekdays.includes(weekdayOf(date)) &&
    !plan.excludedDates.includes(date)
  );
}

/** from 부터 days 일 동안의 일정 (날짜, 시작시간 순) */
export function occurrencesInRange(data: AppData, from: string, days: number): Occurrence[] {
  const records = new Map<string, StudyRecord>();
  for (const r of data.records) records.set(recordKey(r.planId, r.date), r);

  const result: Occurrence[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    for (const plan of data.plans) {
      if (!planOccursOn(plan, date)) continue;
      const subject = data.subjects.find((s) => s.id === plan.subjectId) ?? {
        id: plan.subjectId,
        name: '(삭제된 과목)',
        color: '#999999',
      };
      result.push({ plan, subject, date, record: records.get(recordKey(plan.id, date)) });
    }
  }
  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || toMinutes(a.plan.startTime) - toMinutes(b.plan.startTime),
  );
}

/** 같은 요일, 같은 시간대에 이미 다른 계획이 있으면 그 계획을 돌려준다 */
export function findOverlap(data: AppData, candidate: Plan): Plan | undefined {
  const s = toMinutes(candidate.startTime);
  const e = toMinutes(candidate.endTime);
  return data.plans.find(
    (p) =>
      p.id !== candidate.id &&
      p.startDate <= candidate.endDate &&
      candidate.startDate <= p.endDate &&
      p.weekdays.some((w) => candidate.weekdays.includes(w)) &&
      toMinutes(p.startTime) < e &&
      s < toMinutes(p.endTime),
  );
}

/** 기간 안에 실제로 일정이 하나라도 생기는지 */
export function countOccurrences(plan: Plan): number {
  let n = 0;
  for (let d = plan.startDate; d <= plan.endDate; d = addDays(d, 1)) {
    if (planOccursOn(plan, d)) n++;
  }
  return n;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
