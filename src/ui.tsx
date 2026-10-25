import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useRef, useState } from 'react';
import {
  Alert,
  PanResponder,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { RecordStatus } from './types';
import { addDays, dateAt, formatFull, formatWeekRange, mondayOf, toDateStr, today } from './lib/date';

export const colors = {
  bg: '#F6F7FB',
  card: '#FFFFFF',
  text: '#1F2333',
  sub: '#6B7080',
  line: '#E3E5EC',
  primary: '#3D5AFE',
  primarySoft: '#E8ECFF',
  danger: '#E53935',
  done: '#2E7D32',
  studying: '#F57C00',
  skipped: '#9E9E9E',
};

export const STATUS_LABEL: Record<RecordStatus | 'planned', string> = {
  planned: '예정',
  studying: '공부중',
  done: '완료',
  skipped: '못함',
};

export const STATUS_ICON: Record<RecordStatus | 'planned', string> = {
  planned: '⏳',
  studying: '▶️',
  done: '✅',
  skipped: '❌',
};

export const RATINGS = [
  { value: 1, emoji: '😥', label: '어려웠어' },
  { value: 2, emoji: '🙂', label: '보통' },
  { value: 3, emoji: '😄', label: '잘했어' },
];

/** 색에 투명도를 더한 연한 배경색 */
export function soft(hex: string, alpha = 0.18): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export function confirm(title: string, message: string, onOk: () => void, okText = '확인') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: okText, style: 'destructive', onPress: onOk },
  ]);
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  style,
  big,
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'soft' | 'danger' | 'ghost';
  style?: StyleProp<ViewStyle>;
  big?: boolean;
  disabled?: boolean;
}) {
  const bg = { primary: colors.primary, soft: colors.primarySoft, danger: colors.danger, ghost: 'transparent' }[kind];
  const fg = kind === 'primary' || kind === 'danger' ? '#fff' : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        big && styles.btnBig,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Text style={[styles.btnText, big && styles.btnTextBig, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.primary,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: color, backgroundColor: selected ? color : '#fff' }]}
    >
      <Text style={[styles.chipText, { color: selected ? '#fff' : color }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

/** 'HH:MM' 또는 'YYYY-MM-DD' 를 고르는 버튼. 안드로이드 기본 시계/달력이 뜬다. */
export function PickerField({
  mode,
  value,
  onChange,
  display,
}: {
  mode: 'time' | 'date';
  value: string;
  onChange: (v: string) => void;
  display?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = mode === 'time' ? dateAt(today(), value) : dateAt(value, '00:00');

  const onPress = () => {
    if (Platform.OS === 'web') {
      const v = window.prompt(mode === 'time' ? '시간 (예: 16:30)' : '날짜 (예: 2026-11-02)', value);
      if (v && (mode === 'time' ? /^\d{2}:\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/).test(v)) onChange(v);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Pressable onPress={onPress} style={styles.field}>
        <Text style={styles.fieldText}>{display ?? value}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={current}
          mode={mode}
          is24Hour
          minuteInterval={5}
          onChange={(event, d) => {
            setOpen(false);
            if (event.type !== 'set' || !d) return;
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            onChange(mode === 'time' ? `${hh}:${mm}` : toDateStr(d));
          }}
        />
      )}
    </>
  );
}

/** 주 단위 이동: ◀ 이전 주 / 다음 주 ▶ / 이번 주. 좌우로 밀어도 이동한다. */
export function WeekNav({ monday, onChange }: { monday: string; onChange: (m: string) => void }) {
  const thisWeek = mondayOf(today());
  return (
    <View style={styles.weekNav}>
      <Pressable hitSlop={12} onPress={() => onChange(addDays(monday, -7))} style={styles.navBtn}>
        <Text style={styles.navArrow}>◀</Text>
      </Pressable>
      <Pressable onPress={() => onChange(thisWeek)} style={{ alignItems: 'center', flex: 1 }}>
        <Text style={styles.weekTitle}>{formatWeekRange(monday)}</Text>
        <Text style={[styles.weekSub, monday === thisWeek && { color: colors.primary }]}>
          {monday === thisWeek ? '이번 주' : '이번 주로 돌아가기'}
        </Text>
      </Pressable>
      <Pressable hitSlop={12} onPress={() => onChange(addDays(monday, 7))} style={styles.navBtn}>
        <Text style={styles.navArrow}>▶</Text>
      </Pressable>
    </View>
  );
}

export function useWeekSwipe(monday: string, onChange: (m: string) => void) {
  const ref = useRef({ monday, onChange });
  ref.current = { monday, onChange };
  return useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 60) return;
        const { monday: m, onChange: cb } = ref.current;
        cb(addDays(m, g.dx < 0 ? 7 : -7));
      },
    }),
  ).current.panHandlers;
}

export function DateTitle({ date }: { date: string }) {
  return <Text style={styles.dateTitle}>{formatFull(date)}</Text>;
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  btnBig: { paddingVertical: 16, borderRadius: 14 },
  btnText: { fontSize: 15, fontWeight: '600' },
  btnTextBig: { fontSize: 18, fontWeight: '700' },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  label: { fontSize: 14, color: colors.sub, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  field: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flex: 1,
  },
  fieldText: { fontSize: 16, color: colors.text, textAlign: 'center' },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  navBtn: { padding: 10 },
  navArrow: { fontSize: 18, color: colors.primary },
  weekTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  weekSub: { fontSize: 12, color: colors.sub, marginTop: 2 },
  dateTitle: { fontSize: 15, color: colors.sub },
});
