import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { mondayOf, parseDate, today, weekDates } from './src/lib/date';
import { setupNotifications, useNotificationTap } from './src/lib/notifications';
import DetailScreen from './src/screens/DetailScreen';
import PlanEditor from './src/screens/PlanEditor';
import RecordsScreen from './src/screens/RecordsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TodayScreen from './src/screens/TodayScreen';
import WeekScreen from './src/screens/WeekScreen';
import { StoreProvider, useStore } from './src/store';
import { Occurrence, Plan } from './src/types';
import { colors } from './src/ui';

type Tab = 'week' | 'today' | 'records' | 'settings';
type Sheet =
  | { type: 'detail'; planId: string; date: string }
  | { type: 'editor'; plan?: Plan; startDate: string; weekday?: number; startTime?: string }
  | null;

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'week', icon: '🗓️', label: '시간표' },
  { key: 'today', icon: '✏️', label: '오늘' },
  { key: 'records', icon: '📊', label: '공부 기록' },
  { key: 'settings', icon: '⚙️', label: '설정' },
];

function Main() {
  const { loaded } = useStore();
  const [tab, setTab] = useState<Tab>('week');
  const [monday, setMonday] = useState(mondayOf(today()));
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    setupNotifications();
  }, []);

  // 알림을 누르면 그 일정의 세부 화면을 연다.
  useNotificationTap((planId, date) => {
    setMonday(mondayOf(date));
    setSheet({ type: 'detail', planId, date });
  });

  const openOcc = (o: Occurrence) => setSheet({ type: 'detail', planId: o.plan.id, date: o.date });

  const addPlan = (weekday?: number, startTime?: string) => {
    // 보고 있는 주의 그 요일(또는 오늘)부터 시작. 지난 날짜면 오늘부터.
    const base = weekday !== undefined ? weekDates(monday)[weekday] : monday;
    const startDate = base < today() ? today() : base;
    setSheet({ type: 'editor', startDate, weekday, startTime });
  };

  if (!loaded) {
    return (
      <View style={[styles.flex, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.appBar}>
        <Text style={styles.appTitle}>원우의 공부 시간표</Text>
      </View>

      <View style={styles.flex}>
        {tab === 'week' && <WeekScreen monday={monday} onChangeWeek={setMonday} onOpen={openOcc} onAdd={addPlan} />}
        {tab === 'today' && <TodayScreen onOpen={openOcc} />}
        {tab === 'records' && <RecordsScreen monday={monday} onChangeWeek={setMonday} onOpen={openOcc} />}
        {tab === 'settings' && (
          <SettingsScreen onEditPlan={(plan) => setSheet({ type: 'editor', plan, startDate: plan.startDate })} />
        )}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabIcon, tab !== t.key && { opacity: 0.45 }]}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && { color: colors.primary, fontWeight: '700' }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={!!sheet} animationType="slide" onRequestClose={() => setSheet(null)}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={styles.sheetBar}>
              <Pressable hitSlop={12} onPress={() => setSheet(null)}>
                <Text style={styles.close}>✕ 닫기</Text>
              </Pressable>
            </View>
            {sheet?.type === 'detail' && (
              <DetailScreen
                key={`${sheet.planId}_${sheet.date}`}
                planId={sheet.planId}
                date={sheet.date}
                onClose={() => setSheet(null)}
                onEdit={(plan) => setSheet({ type: 'editor', plan, startDate: plan.startDate })}
              />
            )}
            {sheet?.type === 'editor' && (
              <PlanEditor
                plan={sheet.plan}
                defaultStartDate={sheet.startDate}
                defaultWeekday={sheet.weekday ?? (sheet.plan ? undefined : (parseDate(sheet.startDate).getDay() + 6) % 7)}
                defaultStartTime={sheet.startTime}
                onClose={() => setSheet(null)}
              />
            )}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Main />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  appBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card },
  appTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  tabBar: { flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 12, color: colors.sub, marginTop: 2 },
  sheetBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.bg },
  close: { fontSize: 16, color: colors.primary, fontWeight: '600' },
});
