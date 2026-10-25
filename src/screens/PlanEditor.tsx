import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { WEEKDAY_LABELS, addDays, formatMD, fromMinutes, toMinutes } from '../lib/date';
import { countOccurrences, findOverlap, newId } from '../lib/schedule';
import { useStore } from '../store';
import { Plan } from '../types';
import { Button, Chip, Label, PickerField, colors, confirm, notify } from '../ui';

type Props = {
  /** 수정할 계획. 없으면 새로 만든다. */
  plan?: Plan;
  defaultStartDate: string;
  defaultWeekday?: number;
  defaultStartTime?: string;
  onClose: () => void;
};

const PERIOD_PRESETS = [
  { label: '1주', days: 6 },
  { label: '4주', days: 27 },
  { label: '8주', days: 55 },
  { label: '12주', days: 83 },
];

/** 스케줄 입력: 과목, 요일(여러 개), 시간, 반복 기간, 목표, 메모 */
export default function PlanEditor({ plan, defaultStartDate, defaultWeekday, defaultStartTime, onClose }: Props) {
  const { data, savePlan } = useStore();
  const initialStart = defaultStartTime ?? '16:00';
  const [draft, setDraft] = useState<Plan>(
    plan ?? {
      id: newId(),
      subjectId: data.subjects[0]?.id ?? '',
      weekdays: defaultWeekday !== undefined ? [defaultWeekday] : [],
      startTime: initialStart,
      endTime: fromMinutes(Math.min(toMinutes(initialStart) + 50, 23 * 60 + 55)),
      startDate: defaultStartDate,
      endDate: addDays(defaultStartDate, 27),
      goal: '',
      memo: '',
      notify: true,
      excludedDates: [],
    },
  );
  const set = (patch: Partial<Plan>) => setDraft((d) => ({ ...d, ...patch }));

  const toggleDay = (i: number) =>
    set({
      weekdays: draft.weekdays.includes(i)
        ? draft.weekdays.filter((d) => d !== i)
        : [...draft.weekdays, i].sort(),
    });

  const setStartTime = (t: string) => {
    // 시작 시간을 옮기면 공부 길이는 그대로 유지
    const len = toMinutes(draft.endTime) - toMinutes(draft.startTime);
    set({ startTime: t, endTime: fromMinutes(Math.min(toMinutes(t) + Math.max(len, 10), 23 * 60 + 55)) });
  };

  const count = countOccurrences(draft);

  const save = () => {
    if (!draft.subjectId) return notify('과목을 골라줘', '설정에서 과목을 먼저 추가해 주세요.');
    if (draft.weekdays.length === 0) return notify('요일을 골라줘', '공부할 요일을 하나 이상 선택해 주세요.');
    if (toMinutes(draft.endTime) <= toMinutes(draft.startTime))
      return notify('시간을 확인해줘', '끝나는 시간이 시작 시간보다 늦어야 해요.');
    if (draft.endDate < draft.startDate)
      return notify('기간을 확인해줘', '반복 끝 날짜가 시작 날짜보다 늦어야 해요.');
    if (count === 0) return notify('일정이 없어요', '이 기간 안에 선택한 요일이 없어요.');

    const doSave = () => {
      savePlan({ ...draft, goal: draft.goal.trim(), memo: draft.memo.trim() });
      onClose();
    };
    const overlap = findOverlap(data, draft);
    if (overlap) {
      const name = data.subjects.find((s) => s.id === overlap.subjectId)?.name ?? '다른 과목';
      confirm(
        '시간이 겹쳐요',
        `${name} (${overlap.startTime}~${overlap.endTime}) 일정과 시간이 겹쳐요. 그래도 저장할까요?`,
        doSave,
        '저장',
      );
    } else doSave();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{plan ? '스케줄 수정' : '새 스케줄'}</Text>

      <Label>과목</Label>
      <View style={styles.wrap}>
        {data.subjects.map((s) => (
          <Chip key={s.id} label={s.name} color={s.color} selected={draft.subjectId === s.id} onPress={() => set({ subjectId: s.id })} />
        ))}
      </View>

      <Label>요일 (여러 개 선택 가능)</Label>
      <View style={styles.wrap}>
        {WEEKDAY_LABELS.map((l, i) => (
          <Chip key={l} label={l} selected={draft.weekdays.includes(i)} onPress={() => toggleDay(i)} />
        ))}
      </View>

      <Label>공부 시간</Label>
      <View style={styles.row}>
        <PickerField mode="time" value={draft.startTime} onChange={setStartTime} />
        <Text style={styles.tilde}>~</Text>
        <PickerField mode="time" value={draft.endTime} onChange={(t) => set({ endTime: t })} />
      </View>

      <Label>반복 기간</Label>
      <View style={styles.row}>
        <PickerField
          mode="date"
          value={draft.startDate}
          display={draft.startDate}
          onChange={(d) => set({ startDate: d, endDate: d > draft.endDate ? addDays(d, 27) : draft.endDate })}
        />
        <Text style={styles.tilde}>~</Text>
        <PickerField mode="date" value={draft.endDate} onChange={(d) => set({ endDate: d })} />
      </View>
      <View style={[styles.wrap, { marginTop: 8 }]}>
        {PERIOD_PRESETS.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            selected={draft.endDate === addDays(draft.startDate, p.days)}
            onPress={() => set({ endDate: addDays(draft.startDate, p.days) })}
          />
        ))}
      </View>
      <Text style={styles.summary}>
        {draft.weekdays.length > 0
          ? `${formatMD(draft.startDate)}~${formatMD(draft.endDate)} 동안 매주 ${draft.weekdays
              .map((i) => WEEKDAY_LABELS[i])
              .join('·')}요일, 모두 ${count}번 공부해요.`
          : '요일을 고르면 몇 번 공부하는지 알려줄게요.'}
      </Text>

      <Label>공부 목표 (분량)</Label>
      <TextInput
        value={draft.goal}
        onChangeText={(goal) => set({ goal })}
        placeholder="예: 수학익힘책 2쪽, 영단어 30개"
        style={styles.input}
      />

      <Label>메모</Label>
      <TextInput
        value={draft.memo}
        onChangeText={(memo) => set({ memo })}
        placeholder="준비물이나 기억할 것"
        multiline
        style={[styles.input, { minHeight: 70 }]}
      />

      <View style={[styles.row, { marginTop: 20, justifyContent: 'space-between' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>알림 받기</Text>
          <Text style={styles.switchSub}>시작 10분 전, 끝나는 시간에 알려줘요</Text>
        </View>
        <Switch value={draft.notify} onValueChange={(v) => set({ notify: v })} />
      </View>

      <Button big title="저장" onPress={save} style={{ marginTop: 28 }} />
      <Button kind="ghost" title="취소" onPress={onClose} style={{ marginTop: 6 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center' },
  tilde: { marginHorizontal: 10, fontSize: 16, color: colors.sub },
  summary: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  switchTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  switchSub: { fontSize: 13, color: colors.sub, marginTop: 2 },
});
