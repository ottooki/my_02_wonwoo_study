import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { syncNotifications } from './lib/notifications';
import { recordKey } from './lib/schedule';
import { AppData, Plan, StudyRecord, Subject } from './types';

const STORAGE_KEY = 'wonwoo-study/v1';

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'kor', name: '국어', color: '#EF5350' },
  { id: 'math', name: '수학', color: '#42A5F5' },
  { id: 'eng', name: '영어', color: '#66BB6A' },
  { id: 'sci', name: '과학', color: '#AB47BC' },
  { id: 'soc', name: '사회', color: '#FFA726' },
  { id: 'read', name: '독서', color: '#8D6E63' },
];

const EMPTY: AppData = { subjects: DEFAULT_SUBJECTS, plans: [], records: [] };

type Store = {
  data: AppData;
  loaded: boolean;
  savePlan: (plan: Plan) => void;
  deletePlan: (planId: string) => void;
  excludeDate: (planId: string, date: string) => void;
  saveSubject: (subject: Subject) => void;
  deleteSubject: (subjectId: string) => void;
  startStudy: (planId: string, date: string) => void;
  /** times 를 주면 그 시각으로 기록한다 (지난 날짜를 나중에 기록할 때) */
  completeStudy: (
    planId: string,
    date: string,
    content: string,
    rating: number,
    times?: { start: string; end: string },
  ) => void;
  skipStudy: (planId: string, date: string, reason: string) => void;
  resetRecord: (planId: string, date: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setData({ ...EMPTY, ...JSON.parse(raw) });
      })
      .catch((e) => console.warn('데이터 불러오기 실패', e))
      .finally(() => setLoaded(true));
  }, []);

  // 데이터가 바뀔 때마다 저장하고 알림을 다시 예약한다.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) => console.warn('저장 실패', e));
    syncNotifications(data);
  }, [data, loaded]);

  // 앱을 다시 열면 앞으로 14일치 알림을 다시 채운다.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && loaded) syncNotifications(dataRef.current);
    });
    return () => sub.remove();
  }, [loaded]);

  const updateRecord = useCallback(
    (planId: string, date: string, fn: (prev: StudyRecord | undefined) => StudyRecord | undefined) => {
      setData((d) => {
        const key = recordKey(planId, date);
        const prev = d.records.find((r) => recordKey(r.planId, r.date) === key);
        const others = d.records.filter((r) => recordKey(r.planId, r.date) !== key);
        const next = fn(prev);
        return { ...d, records: next ? [...others, next] : others };
      });
    },
    [],
  );

  const store: Store = {
    data,
    loaded,
    savePlan: (plan) =>
      setData((d) => ({
        ...d,
        plans: d.plans.some((p) => p.id === plan.id)
          ? d.plans.map((p) => (p.id === plan.id ? plan : p))
          : [...d.plans, plan],
      })),
    deletePlan: (planId) =>
      setData((d) => ({
        ...d,
        plans: d.plans.filter((p) => p.id !== planId),
        records: d.records.filter((r) => r.planId !== planId),
      })),
    excludeDate: (planId, date) =>
      setData((d) => ({
        ...d,
        plans: d.plans.map((p) =>
          p.id === planId ? { ...p, excludedDates: [...p.excludedDates, date] } : p,
        ),
        records: d.records.filter((r) => !(r.planId === planId && r.date === date)),
      })),
    saveSubject: (subject) =>
      setData((d) => ({
        ...d,
        subjects: d.subjects.some((s) => s.id === subject.id)
          ? d.subjects.map((s) => (s.id === subject.id ? subject : s))
          : [...d.subjects, subject],
      })),
    deleteSubject: (subjectId) =>
      setData((d) => ({ ...d, subjects: d.subjects.filter((s) => s.id !== subjectId) })),
    startStudy: (planId, date) =>
      updateRecord(planId, date, () => ({
        planId,
        date,
        status: 'studying',
        actualStart: new Date().toISOString(),
      })),
    completeStudy: (planId, date, content, rating, times) =>
      updateRecord(planId, date, (prev) => ({
        planId,
        date,
        status: 'done',
        actualStart: times?.start ?? prev?.actualStart ?? new Date().toISOString(),
        actualEnd: times?.end ?? new Date().toISOString(),
        content,
        rating,
      })),
    skipStudy: (planId, date, reason) =>
      updateRecord(planId, date, () => ({ planId, date, status: 'skipped', skipReason: reason })),
    resetRecord: (planId, date) => updateRecord(planId, date, () => undefined),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('StoreProvider가 필요합니다');
  return s;
}
