import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WEEKDAY_LABELS, formatMD, toMinutes, today, weekDates } from '../lib/date';
import { occurrencesInRange } from '../lib/schedule';
import { useStore } from '../store';
import { Occurrence } from '../types';
import { STATUS_ICON, WeekNav, colors, soft, useWeekSwipe } from '../ui';

const HOUR_HEIGHT = 56;
const TIME_COL = 36;

type Props = {
  monday: string;
  onChangeWeek: (m: string) => void;
  onOpen: (occ: Occurrence) => void;
  onAdd: (weekday?: number, startTime?: string) => void;
};

/** 월~일 주간 시간표 */
export default function WeekScreen({ monday, onChangeWeek, onOpen, onAdd }: Props) {
  const { data } = useStore();
  const dates = weekDates(monday);
  const occs = occurrencesInRange(data, monday, 7);
  const swipe = useWeekSwipe(monday, onChangeWeek);
  const now = today();

  // 기본 오후 2시~9시, 일정이 그 밖에 있으면 넓힌다.
  let fromHour = 14;
  let toHour = 21;
  for (const o of occs) {
    fromHour = Math.min(fromHour, Math.floor(toMinutes(o.plan.startTime) / 60));
    toHour = Math.max(toHour, Math.ceil(toMinutes(o.plan.endTime) / 60));
  }
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);

  return (
    <View style={{ flex: 1 }}>
      <WeekNav monday={monday} onChange={onChangeWeek} />
      <View style={styles.headerRow}>
        <View style={{ width: TIME_COL }} />
        {dates.map((d, i) => (
          <View key={d} style={[styles.dayHead, d === now && styles.todayHead]}>
            <Text style={[styles.dayLabel, i >= 5 && { color: i === 6 ? colors.danger : colors.primary }, d === now && { color: '#fff' }]}>
              {WEEKDAY_LABELS[i]}
            </Text>
            <Text style={[styles.dayDate, d === now && { color: '#fff' }]}>{formatMD(d)}</Text>
          </View>
        ))}
      </View>

      <ScrollView {...swipe} contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: TIME_COL }}>
            {hours.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT }}>
                <Text style={styles.hourLabel}>{h}시</Text>
              </View>
            ))}
          </View>
          {dates.map((d, dayIdx) => (
            <View key={d} style={[styles.dayCol, d === now && { backgroundColor: soft(colors.primary, 0.05) }]}>
              {hours.map((h) => (
                <Pressable
                  key={h}
                  style={styles.hourCell}
                  onPress={() => onAdd(dayIdx, `${String(h).padStart(2, '0')}:00`)}
                />
              ))}
              {occs
                .filter((o) => o.date === d)
                .map((o) => {
                  const top = ((toMinutes(o.plan.startTime) - fromHour * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    22,
                    ((toMinutes(o.plan.endTime) - toMinutes(o.plan.startTime)) / 60) * HOUR_HEIGHT - 2,
                  );
                  const status = o.record?.status ?? 'planned';
                  const done = status === 'done';
                  return (
                    <Pressable
                      key={o.plan.id}
                      onPress={() => onOpen(o)}
                      style={[
                        styles.block,
                        {
                          top,
                          height,
                          backgroundColor: done ? o.subject.color : soft(o.subject.color, 0.22),
                          borderColor: o.subject.color,
                          opacity: status === 'skipped' ? 0.45 : 1,
                        },
                      ]}
                    >
                      <Text numberOfLines={2} style={[styles.blockText, { color: done ? '#fff' : colors.text }]}>
                        {o.subject.name}
                      </Text>
                      {height > 40 && (
                        <Text style={[styles.blockTime, { color: done ? '#fff' : colors.sub }]}>{o.plan.startTime}</Text>
                      )}
                      <Text style={styles.blockIcon}>{STATUS_ICON[status]}</Text>
                    </Pressable>
                  );
                })}
            </View>
          ))}
        </View>
        {occs.length === 0 && (
          <Text style={styles.empty}>이번 주 스케줄이 없어요.{'\n'}아래 [+ 스케줄 추가]를 눌러 만들어 보자!</Text>
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => onAdd()}>
        <Text style={styles.fabText}>+ 스케줄 추가</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', backgroundColor: colors.card, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  dayHead: { flex: 1, alignItems: 'center', paddingVertical: 4, marginHorizontal: 1, borderRadius: 8 },
  todayHead: { backgroundColor: colors.primary },
  dayLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  dayDate: { fontSize: 11, color: colors.sub },
  hourLabel: { fontSize: 10, color: colors.sub, textAlign: 'right', paddingRight: 4, marginTop: -7 },
  dayCol: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line },
  hourCell: { height: HOUR_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  block: { position: 'absolute', left: 1, right: 1, borderRadius: 6, borderLeftWidth: 3, padding: 2, overflow: 'hidden' },
  blockText: { fontSize: 11, fontWeight: '700' },
  blockTime: { fontSize: 9 },
  blockIcon: { position: 'absolute', right: 1, bottom: 1, fontSize: 9 },
  empty: { textAlign: 'center', color: colors.sub, marginTop: 24, lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
