import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { dateAt, formatClock, formatDuration, minutesBetween, toMinutes, today } from '../lib/date';
import { occurrencesInRange } from '../lib/schedule';
import { useStore } from '../store';
import { Plan } from '../types';
import {
  Button,
  Card,
  DateTitle,
  Label,
  PickerField,
  RATINGS,
  STATUS_ICON,
  STATUS_LABEL,
  colors,
  confirm,
  notify,
} from '../ui';
import { useNow } from './TodayScreen';

const SKIP_REASONS = ['학원', '숙제', '아팠어', '깜빡했어', '가족 일정'];

type Props = {
  planId: string;
  date: string;
  onClose: () => void;
  onEdit: (plan: Plan) => void;
};

const clockNow = () => formatClock(new Date().toISOString());

/** 일정 한 칸의 세부 내역 + 공부 시작/완료/못함 기록 */
export default function DetailScreen({ planId, date, onClose, onEdit }: Props) {
  const store = useStore();
  const now = useNow();
  const occ = occurrencesInRange(store.data, date, 1).find((o) => o.plan.id === planId);
  const [mode, setMode] = useState<'view' | 'complete' | 'skip'>('view');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(2);
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  if (!occ) {
    return (
      <View style={{ padding: 24 }}>
        <Text style={{ fontSize: 16 }}>이 일정은 삭제되었어요.</Text>
        <Button title="닫기" onPress={onClose} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const { plan, subject, record } = occ;
  const status = record?.status ?? 'planned';
  const isToday = date === today();
  const isPast = date < today();
  const canRecord = isToday || isPast;

  const openComplete = () => {
    setStartTime(record?.actualStart ? formatClock(record.actualStart) : plan.startTime);
    setEndTime(isToday ? clockNow() : plan.endTime);
    setContent(record?.content ?? '');
    setRating(record?.rating ?? 2);
    setMode('complete');
  };

  const saveComplete = () => {
    if (!content.trim()) {
      notify('공부한 내용을 적어줘', '간단하게라도 어떤 공부를 했는지 적어주세요.');
      return;
    }
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      notify('시간을 확인해줘', '끝난 시간이 시작 시간보다 늦어야 해요.');
      return;
    }
    store.completeStudy(plan.id, date, content.trim(), rating, {
      start: dateAt(date, startTime).toISOString(),
      end: dateAt(date, endTime).toISOString(),
    });
    setMode('view');
  };

  const saveSkip = () => {
    store.skipStudy(plan.id, date, reason.trim());
    setMode('view');
  };

  const deleteOne = () =>
    confirm('이 날만 삭제', `${subject.name} 일정을 이 날만 지울까요? 다른 날은 그대로 있어요.`, () => {
      store.excludeDate(plan.id, date);
      onClose();
    }, '삭제');

  const deleteAll = () =>
    confirm(
      '반복 일정 전체 삭제',
      `${plan.startDate} ~ ${plan.endDate} 기간의 ${subject.name} 일정과 기록을 모두 지울까요?`,
      () => {
        store.deletePlan(plan.id);
        onClose();
      },
      '전체 삭제',
    );

  const rated = RATINGS.find((r) => r.value === record?.rating);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <View style={[styles.header, { backgroundColor: subject.color }]}>
        <Text style={styles.headerSubject}>{subject.name}</Text>
        <Text style={styles.headerTime}>
          {plan.startTime} ~ {plan.endTime}
        </Text>
        <Text style={styles.headerStatus}>
          {STATUS_ICON[status]} {STATUS_LABEL[status]}
        </Text>
      </View>
      <DateTitle date={date} />

      <Card style={{ marginTop: 12 }}>
        <Row label="🎯 목표" value={plan.goal || '-'} />
        <Row label="📝 메모" value={plan.memo || '-'} />
        <Row label="🔁 반복" value={`${plan.startDate} ~ ${plan.endDate}`} />
        <Row label="🔔 알림" value={plan.notify ? '시작 10분 전, 끝날 때' : '끔'} />
      </Card>

      {record && status !== 'skipped' && (
        <Card>
          <Text style={styles.cardTitle}>공부 기록</Text>
          <Row label="시작" value={formatClock(record.actualStart)} />
          <Row label="완료" value={status === 'done' ? formatClock(record.actualEnd) : '공부중'} />
          <Row
            label="공부 시간"
            value={formatDuration(minutesBetween(record.actualStart, record.actualEnd ?? now.toISOString()))}
          />
          {status === 'done' && (
            <>
              <Row label="공부한 내용" value={record.content || '-'} />
              <Row label="스스로 평가" value={rated ? `${rated.emoji} ${rated.label}` : '-'} />
            </>
          )}
        </Card>
      )}
      {status === 'skipped' && (
        <Card>
          <Row label="못한 이유" value={record?.skipReason || '-'} />
        </Card>
      )}

      {mode === 'complete' && (
        <Card>
          <Text style={styles.cardTitle}>공부 완료 기록하기</Text>
          <Label style={{ marginTop: 4 }}>공부한 시간</Label>
          <View style={styles.timeRow}>
            <PickerField mode="time" value={startTime} onChange={setStartTime} />
            <Text style={{ marginHorizontal: 8 }}>~</Text>
            <PickerField mode="time" value={endTime} onChange={setEndTime} />
          </View>
          <Label>공부한 내용</Label>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="예: 분수의 나눗셈 문제 20개 풀었어"
            multiline
            style={styles.input}
          />
          <Label>오늘 공부는 어땠어?</Label>
          <View style={styles.ratingRow}>
            {RATINGS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setRating(r.value)}
                style={[styles.rating, rating === r.value && styles.ratingOn]}
              >
                <Text style={{ fontSize: 30 }}>{r.emoji}</Text>
                <Text style={styles.ratingLabel}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
          <Button big title="저장" onPress={saveComplete} style={{ marginTop: 16 }} />
          <Button kind="ghost" title="취소" onPress={() => setMode('view')} />
        </Card>
      )}

      {mode === 'skip' && (
        <Card>
          <Text style={styles.cardTitle}>왜 못했어?</Text>
          <View style={styles.wrap}>
            {SKIP_REASONS.map((r) => (
              <Pressable key={r} onPress={() => setReason(r)} style={[styles.reason, reason === r && styles.reasonOn]}>
                <Text style={{ color: reason === r ? '#fff' : colors.text }}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={reason} onChangeText={setReason} placeholder="직접 적어도 돼" style={styles.input} />
          <Button big title="저장" onPress={saveSkip} style={{ marginTop: 16 }} />
          <Button kind="ghost" title="취소" onPress={() => setMode('view')} />
        </Card>
      )}

      {mode === 'view' && (
        <View style={{ gap: 10, marginTop: 4 }}>
          {status === 'planned' && isToday && (
            <Button big title="▶ 공부 시작" onPress={() => store.startStudy(plan.id, date)} />
          )}
          {status === 'planned' && isPast && <Button big title="✔ 공부한 것 기록하기" onPress={openComplete} />}
          {status === 'studying' && (
            <Button big title="✔ 공부 완료" onPress={openComplete} style={{ backgroundColor: colors.done }} />
          )}
          {status === 'done' && <Button kind="soft" title="기록 고치기" onPress={openComplete} />}
          {canRecord && (status === 'planned' || status === 'studying') && (
            <Button kind="soft" title="오늘은 못했어" onPress={() => setMode('skip')} />
          )}
          {status === 'studying' && (
            <Button kind="ghost" title="공부 시작 취소" onPress={() => store.resetRecord(plan.id, date)} />
          )}
          {status === 'skipped' && (
            <Button kind="soft" title="기록 지우기" onPress={() => store.resetRecord(plan.id, date)} />
          )}
          {!canRecord && <Text style={styles.hint}>공부 시작은 그날이 되면 할 수 있어요.</Text>}

          <View style={styles.divider} />
          <Button kind="soft" title="일정 수정" onPress={() => onEdit(plan)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button kind="ghost" title="이 날만 삭제" onPress={deleteOne} style={{ flex: 1 }} />
            <Button kind="ghost" title="반복 전체 삭제" onPress={deleteAll} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderRadius: 16, padding: 20, marginBottom: 12 },
  headerSubject: { color: '#fff', fontSize: 28, fontWeight: '800' },
  headerTime: { color: '#fff', fontSize: 18, marginTop: 4 },
  headerStatus: { color: '#fff', fontSize: 15, marginTop: 8, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', paddingVertical: 6 },
  rowLabel: { width: 100, color: colors.sub, fontSize: 14 },
  rowValue: { flex: 1, color: colors.text, fontSize: 15 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  ratingRow: { flexDirection: 'row', gap: 8 },
  rating: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 2, borderColor: colors.line },
  ratingOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  ratingLabel: { fontSize: 13, color: colors.text, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  reason: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.bg },
  reasonOn: { backgroundColor: colors.primary },
  hint: { textAlign: 'center', color: colors.sub },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 8 },
});
