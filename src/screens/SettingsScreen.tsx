import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WEEKDAY_LABELS } from '../lib/date';
import { exactAlarmGranted, requestExactAlarm, sendTestNotification, setupNotifications } from '../lib/notifications';
import { newId } from '../lib/schedule';
import { useStore } from '../store';
import { Plan } from '../types';
import { Button, Card, colors, confirm, notify } from '../ui';

const PALETTE = ['#EF5350', '#EC407A', '#AB47BC', '#5C6BC0', '#42A5F5', '#26A69A', '#66BB6A', '#D4E157', '#FFA726', '#8D6E63', '#78909C'];

/** 과목 관리, 알림 확인, 전체 반복 일정 목록 */
export default function SettingsScreen({ onEditPlan }: { onEditPlan: (plan: Plan) => void }) {
  const { data, saveSubject, deleteSubject } = useStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[4]);
  const [notifOk, setNotifOk] = useState<boolean | null>(null);
  const [exactOk, setExactOk] = useState(true);

  const refresh = async () => {
    setNotifOk(await setupNotifications());
    setExactOk(await exactAlarmGranted());
  };
  useEffect(() => {
    refresh();
  }, []);

  const addSubject = () => {
    const n = name.trim();
    if (!n) return;
    if (data.subjects.some((s) => s.name === n)) return notify('이미 있는 과목이에요', n);
    saveSubject({ id: newId(), name: n, color });
    setName('');
  };

  const removeSubject = (id: string, subjectName: string) => {
    if (data.plans.some((p) => p.subjectId === id)) {
      notify('삭제할 수 없어요', `${subjectName} 과목을 쓰는 스케줄이 있어요. 스케줄을 먼저 지워주세요.`);
      return;
    }
    confirm('과목 삭제', `${subjectName} 과목을 지울까요?`, () => deleteSubject(id), '삭제');
  };

  const plans = [...data.plans].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>🔔 알림</Text>
      <Card>
        <Text style={styles.text}>
          알림 권한: {notifOk === null ? '확인 중…' : notifOk ? '허용됨 ✅' : '꺼져 있음 ❌'}
        </Text>
        {notifOk === false && (
          <Text style={styles.hint}>휴대폰 설정 → 애플리케이션 → 원우 공부 → 알림에서 켜 주세요.</Text>
        )}
        {!exactOk && (
          <>
            <Text style={[styles.hint, { marginTop: 8 }]}>
              정확한 시간 알림이 꺼져 있어서 알림이 몇 분 늦게 올 수 있어요.
            </Text>
            <Button kind="soft" title="정확한 시간 알림 켜기" onPress={() => requestExactAlarm().then(refresh)} style={{ marginTop: 8 }} />
          </>
        )}
        <Button kind="soft" title="5초 뒤 테스트 알림 보내기" onPress={sendTestNotification} style={{ marginTop: 12 }} />
      </Card>

      <Text style={styles.section}>📚 과목</Text>
      <Card>
        {data.subjects.map((s) => (
          <View key={s.id} style={styles.subjectRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={[styles.text, { flex: 1 }]}>{s.name}</Text>
            <Pressable hitSlop={10} onPress={() => removeSubject(s.id, s.name)}>
              <Text style={{ color: colors.danger }}>삭제</Text>
            </Pressable>
          </View>
        ))}
        <View style={[styles.subjectRow, { marginTop: 8 }]}>
          <TextInput value={name} onChangeText={setName} placeholder="새 과목 이름 (예: 한자)" style={styles.input} />
          <Button title="추가" onPress={addSubject} style={{ marginLeft: 8 }} />
        </View>
        <View style={styles.palette}>
          {PALETTE.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]} />
          ))}
        </View>
      </Card>

      <Text style={styles.section}>🔁 반복 스케줄 전체 ({plans.length})</Text>
      {plans.length === 0 && <Text style={styles.hint}>아직 스케줄이 없어요.</Text>}
      {plans.map((p) => {
        const s = data.subjects.find((x) => x.id === p.subjectId);
        return (
          <Pressable key={p.id} onPress={() => onEditPlan(p)}>
            <Card style={{ borderLeftWidth: 5, borderLeftColor: s?.color ?? '#999' }}>
              <Text style={styles.planTitle}>
                {s?.name ?? '(삭제된 과목)'} · {p.weekdays.map((i) => WEEKDAY_LABELS[i]).join('·')} {p.startTime}~{p.endTime}
              </Text>
              <Text style={styles.hint}>
                {p.startDate} ~ {p.endDate}
                {p.goal ? ` · ${p.goal}` : ''}
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 8 },
  text: { fontSize: 15, color: colors.text },
  hint: { fontSize: 13, color: colors.sub, marginTop: 4 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, marginRight: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 15 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  swatchOn: { borderWidth: 3, borderColor: colors.text },
  planTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
});
