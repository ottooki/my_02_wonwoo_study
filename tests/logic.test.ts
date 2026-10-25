/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mondayOf, weekdayOf } from '../src/lib/date';
import { planNotifications } from '../src/lib/notifyPlan';
import { countOccurrences, findOverlap, occurrencesInRange } from '../src/lib/schedule';
import { AppData, Plan } from '../src/types';

const math: Plan = {
  id: 'p1',
  subjectId: 'math',
  weekdays: [0, 2], // 월, 수
  startTime: '16:00',
  endTime: '16:50',
  startDate: '2026-10-26', // 월
  endDate: '2026-11-08', // 2주 뒤 일요일
  goal: '익힘책 2쪽',
  memo: '',
  notify: true,
  excludedDates: [],
};

const base = (patch: Partial<AppData> = {}): AppData => ({
  subjects: [{ id: 'math', name: '수학', color: '#42A5F5' }],
  plans: [math],
  records: [],
  ...patch,
});

test('요일 계산: 월=0, 일=6, 주 시작은 월요일', () => {
  assert.equal(weekdayOf('2026-10-26'), 0);
  assert.equal(weekdayOf('2026-11-01'), 6);
  assert.equal(mondayOf('2026-11-01'), '2026-10-26');
  assert.equal(mondayOf('2026-10-26'), '2026-10-26');
});

test('기간 안의 같은 요일마다 반복된다', () => {
  const occ = occurrencesInRange(base(), '2026-10-19', 28).map((o) => o.date);
  assert.deepEqual(occ, ['2026-10-26', '2026-10-28', '2026-11-02', '2026-11-04']);
  assert.equal(countOccurrences(math), 4);
});

test('이 날만 삭제한 날짜는 빠진다', () => {
  const data = base({ plans: [{ ...math, excludedDates: ['2026-10-28'] }] });
  assert.deepEqual(
    occurrencesInRange(data, '2026-10-26', 14).map((o) => o.date),
    ['2026-10-26', '2026-11-02', '2026-11-04'],
  );
});

test('겹치는 시간 감지', () => {
  const other: Plan = { ...math, id: 'p2', weekdays: [2], startTime: '16:30', endTime: '17:00' };
  assert.equal(findOverlap(base(), other)?.id, 'p1');
  assert.equal(findOverlap(base(), { ...other, startTime: '16:50', endTime: '17:30' }), undefined);
  assert.equal(findOverlap(base(), { ...other, weekdays: [1] }), undefined);
});

test('알림: 시작 10분 전과 종료 시각에 예약된다', () => {
  const now = new Date(2026, 9, 26, 12, 0);
  const n = planNotifications(base(), now).filter((x) => x.date === '2026-10-26');
  assert.deepEqual(
    n.map((x) => [x.kind, x.at.getHours(), x.at.getMinutes()]),
    [
      ['start', 15, 50],
      ['end', 16, 50],
    ],
  );
});

test('알림: 미리 공부를 시작하면 시작 알림은 생략, 종료 알림은 유지', () => {
  const now = new Date(2026, 9, 26, 15, 30);
  const data = base({
    records: [{ planId: 'p1', date: '2026-10-26', status: 'studying', actualStart: now.toISOString() }],
  });
  const kinds = planNotifications(data, now)
    .filter((x) => x.date === '2026-10-26')
    .map((x) => x.kind);
  assert.deepEqual(kinds, ['end']);
});

test('알림: 끝나기 전에 완료하면 종료 알림도 생략', () => {
  const now = new Date(2026, 9, 26, 16, 30);
  const data = base({ records: [{ planId: 'p1', date: '2026-10-26', status: 'done' }] });
  assert.equal(planNotifications(data, now).filter((x) => x.date === '2026-10-26').length, 0);
});

test('알림: 지난 시각과 알림 끈 일정은 예약하지 않는다', () => {
  const now = new Date(2026, 9, 26, 16, 0);
  const n = planNotifications(base(), now).filter((x) => x.date === '2026-10-26');
  assert.deepEqual(n.map((x) => x.kind), ['end']);
  assert.equal(planNotifications(base({ plans: [{ ...math, notify: false }] }), now).length, 0);
});
