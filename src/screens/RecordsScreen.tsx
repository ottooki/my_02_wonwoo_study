import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WEEKDAY_LABELS, formatClock, formatDuration, formatMD, minutesBetween, toMinutes, weekDates } from '../lib/date';
import { occurrencesInRange } from '../lib/schedule';
import { useStore } from '../store';
import { Occurrence } from '../types';
import { Card, RATINGS, STATUS_ICON, STATUS_LABEL, WeekNav, colors, useWeekSwipe } from '../ui';

type Props = {
  monday: string;
  onChangeWeek: (m: string) => void;
  onOpen: (occ: Occurrence) => void;
};

const plannedMinutes = (o: Occurrence) => toMinutes(o.plan.endTime) - toMinutes(o.plan.startTime);
const studiedMinutes = (o: Occurrence) =>
  o.record?.status === 'done' ? minutesBetween(o.record.actualStart, o.record.actualEnd) : 0;

/** 주간 공부 기록을 한눈에. 항목을 누르면 세부 내역. */
export default function RecordsScreen({ monday, onChangeWeek, onOpen }: Props) {
  const { data } = useStore();
  const occs = occurrencesInRange(data, monday, 7);
  const swipe = useWeekSwipe(monday, onChangeWeek);

  const done = occs.filter((o) => o.record?.status === 'done');
  const planned = occs.reduce((s, o) => s + plannedMinutes(o), 0);
  const studied = occs.reduce((s, o) => s + studiedMinutes(o), 0);
  const rate = occs.length ? Math.round((done.length / occs.length) * 100) : 0;

  const bySubject = new Map<string, { name: string; color: string; planned: number; studied: number }>();
  for (const o of occs) {
    const e = bySubject.get(o.subject.id) ?? { name: o.subject.name, color: o.subject.color, planned: 0, studied: 0 };
    e.planned += plannedMinutes(o);
    e.studied += studiedMinutes(o);
    bySubject.set(o.subject.id, e);
  }
  const maxMinutes = Math.max(1, ...[...bySubject.values()].map((s) => Math.max(s.planned, s.studied)));

  return (
    <View style={{ flex: 1 }}>
      <WeekNav monday={monday} onChange={onChangeWeek} />
      <ScrollView {...swipe} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.statsRow}>
          <Stat label="완료" value={`${done.length}/${occs.length}`} />
          <Stat label="완료율" value={`${rate}%`} />
          <Stat label="공부한 시간" value={formatDuration(studied)} sub={`계획 ${formatDuration(planned)}`} />
        </View>

        {bySubject.size > 0 && (
          <Card>
            <Text style={styles.cardTitle}>과목별 공부 시간</Text>
            {[...bySubject.values()].map((s) => (
              <View key={s.name} style={styles.barRow}>
                <Text style={styles.barLabel}>{s.name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barPlan, { width: `${(s.planned / maxMinutes) * 100}%`, borderColor: s.color }]} />
                  <View style={[styles.barFill, { width: `${(s.studied / maxMinutes) * 100}%`, backgroundColor: s.color }]} />
                </View>
                <Text style={styles.barValue}>{formatDuration(s.studied)}</Text>
              </View>
            ))}
            <Text style={styles.legend}>색칠된 막대 = 실제 공부, 테두리 = 계획</Text>
          </Card>
        )}

        {weekDates(monday).map((d, i) => {
          const dayOccs = occs.filter((o) => o.date === d);
          if (dayOccs.length === 0) return null;
          return (
            <View key={d}>
              <Text style={styles.dayTitle}>
                {WEEKDAY_LABELS[i]}요일 {formatMD(d)}
              </Text>
              {dayOccs.map((o) => {
                const status = o.record?.status ?? 'planned';
                const rating = RATINGS.find((r) => r.value === o.record?.rating);
                return (
                  <Pressable key={o.plan.id} onPress={() => onOpen(o)}>
                    <Card style={[styles.item, { borderLeftColor: o.subject.color }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>
                          {o.subject.name} <Text style={styles.itemTime}>{o.plan.startTime}~{o.plan.endTime}</Text>
                        </Text>
                        {status === 'done' ? (
                          <Text style={styles.itemSub} numberOfLines={1}>
                            {formatClock(o.record?.actualStart)}~{formatClock(o.record?.actualEnd)} · {o.record?.content}
                          </Text>
                        ) : status === 'skipped' ? (
                          <Text style={styles.itemSub}>못한 이유: {o.record?.skipReason || '-'}</Text>
                        ) : (
                          !!o.plan.goal && <Text style={styles.itemSub}>🎯 {o.plan.goal}</Text>
                        )}
                      </View>
                      <Text style={styles.itemStatus}>
                        {rating ? rating.emoji : STATUS_ICON[status]}
                        {'\n'}
                        <Text style={{ fontSize: 11, color: colors.sub }}>{STATUS_LABEL[status]}</Text>
                      </Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
        {occs.length === 0 && <Text style={styles.empty}>이 주에는 공부 계획이 없어요.</Text>}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 12, color: colors.sub },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
  statSub: { fontSize: 11, color: colors.sub, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  barLabel: { width: 44, fontSize: 13, color: colors.text },
  barTrack: { flex: 1, height: 14, justifyContent: 'center' },
  barPlan: { position: 'absolute', height: 14, borderWidth: 1.5, borderRadius: 4 },
  barFill: { position: 'absolute', height: 14, borderRadius: 4 },
  barValue: { width: 72, fontSize: 12, color: colors.sub, textAlign: 'right' },
  legend: { fontSize: 11, color: colors.sub, marginTop: 6 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, paddingVertical: 12, marginBottom: 8 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemTime: { fontSize: 13, fontWeight: '400', color: colors.sub },
  itemSub: { fontSize: 13, color: colors.sub, marginTop: 4 },
  itemStatus: { fontSize: 22, textAlign: 'center', marginLeft: 8 },
  empty: { textAlign: 'center', color: colors.sub, marginTop: 24 },
});
