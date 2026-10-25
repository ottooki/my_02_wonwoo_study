export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** 0=월 ... 6=일 */
export function weekdayOf(s: string): number {
  return (parseDate(s).getDay() + 6) % 7;
}

/** 그 날짜가 속한 주의 월요일 */
export function mondayOf(s: string): string {
  return addDays(s, -weekdayOf(s));
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function today(): string {
  return toDateStr(new Date());
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** 날짜 + 'HH:MM' → Date */
export function dateAt(date: string, time: string): Date {
  const d = parseDate(date);
  const min = toMinutes(time);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}

export function formatMD(s: string): string {
  const d = parseDate(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatFull(s: string): string {
  const d = parseDate(s);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_LABELS[weekdayOf(s)]})`;
}

export function formatWeekRange(monday: string): string {
  const sun = addDays(monday, 6);
  const m = parseDate(monday);
  return `${m.getFullYear()}년 ${formatMD(monday)} ~ ${formatMD(sun)}`;
}

export function formatClock(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}분`;
  return m % 60 === 0 ? `${h}시간` : `${h}시간 ${m % 60}분`;
}

export function minutesBetween(startIso?: string, endIso?: string): number {
  if (!startIso || !endIso) return 0;
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}
