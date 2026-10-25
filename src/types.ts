// 날짜는 'YYYY-MM-DD', 시간은 'HH:MM' 문자열로 저장한다 (기기 현지 시간 기준).

export type Subject = {
  id: string;
  name: string;
  color: string;
};

/** 기간(startDate~endDate) 안에서 선택한 요일마다 반복되는 공부 계획 */
export type Plan = {
  id: string;
  subjectId: string;
  /** 0=월 ... 6=일 */
  weekdays: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  goal: string;
  memo: string;
  notify: boolean;
  /** '이 날만 삭제'한 날짜 */
  excludedDates: string[];
};

export type RecordStatus = 'studying' | 'done' | 'skipped';

/** 계획 하나의 특정 날짜 공부 실적 */
export type StudyRecord = {
  planId: string;
  date: string;
  status: RecordStatus;
  /** ISO 시각 */
  actualStart?: string;
  actualEnd?: string;
  content?: string;
  /** 1=어려웠어 2=보통 3=잘했어 */
  rating?: number;
  skipReason?: string;
};

/** 달력에 펼쳐진 계획 한 칸 */
export type Occurrence = {
  plan: Plan;
  subject: Subject;
  date: string;
  record?: StudyRecord;
};

export type AppData = {
  subjects: Subject[];
  plans: Plan[];
  records: StudyRecord[];
};
