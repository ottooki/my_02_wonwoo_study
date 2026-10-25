import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatClock, formatDuration, minutesBetween, today } from '../lib/date';
import { occurrencesInRange } from '../lib/schedule';
import { useStore } from '../store';
import { Occurrence } from '../types';
import { Button, Card, DateTitle, STATUS_ICON, STATUS_LABEL, colors } from '../ui';

export function useNow(intervalMs = 15000): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** 오늘 할 공부 목록. 여기서 바로 [공부 시작]을 누를 수 있다. */
export default function TodayScreen({ onOpen }: { onOpen: (occ: Occurrence) => void }) {
  const { data, startStudy } = useStore();
  const now = useNow();
  const date = today();
  const occs = occurrencesInRange(data, date, 1);
  const doneCount = occs.filter((o) => o.record?.status === 'done').length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <DateTitle date={date} />
      <Text style={styles.title}>
        {occs.length === 0 ? '오늘은 공부 계획이 없어요 🎉' : `오늘 공부 ${doneCount} / ${occs.length} 완료`}
      </Text>

      {occs.map((o) => {
        const status = o.record?.status ?? 'planned';
        return (
          <Pressable key={o.plan.id} onPress={() => onOpen(o)}>
            <Card style={{ borderLeftWidth: 6, borderLeftColor: o.subject.color }}>
              <View style={styles.row}>
                <Text style={styles.subject}>{o.subject.name}</Text>
                <Text style={styles.status}>
                  {STATUS_ICON[status]} {STATUS_LABEL[status]}
                </Text>
              </View>
              <Text style={styles.time}>
                {o.plan.startTime} ~ {o.plan.endTime}
              </Text>
              {!!o.plan.goal && <Text style={styles.goal}>🎯 {o.plan.goal}</Text>}

              {status === 'planned' && (
                <Button big title="▶ 공부 시작" onPress={() => startStudy(o.plan.id, o.date)} style={{ marginTop: 12 }} />
              )}
              {status === 'studying' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.timer}>
                    {formatClock(o.record?.actualStart)}부터 공부중 · {formatDuration(minutesBetween(o.record?.actualStart, now.toISOString()))}
                  </Text>
                  <Button big title="✔ 공부 완료" onPress={() => onOpen(o)} style={{ marginTop: 8, backgroundColor: colors.done }} />
                </View>
              )}
              {status === 'done' && (
                <Text style={styles.result} numberOfLines={2}>
                  {formatClock(o.record?.actualStart)}~{formatClock(o.record?.actualEnd)} · {o.record?.content}
                </Text>
              )}
              {status === 'skipped' && <Text style={styles.result}>못한 이유: {o.record?.skipReason || '-'}</Text>}
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subject: { fontSize: 20, fontWeight: '800', color: colors.text },
  status: { fontSize: 14, color: colors.sub },
  time: { fontSize: 16, color: colors.text, marginTop: 4 },
  goal: { fontSize: 15, color: colors.text, marginTop: 6 },
  timer: { fontSize: 15, color: colors.studying, fontWeight: '700', textAlign: 'center' },
  result: { fontSize: 14, color: colors.sub, marginTop: 10 },
});
