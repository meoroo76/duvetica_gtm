export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayOfWeek(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(dateStr).getDay()];
}

export function getDayOfWeekKR(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateStr).getDay()];
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

export function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

export function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const dayOfMonth = d.getDate();
  return Math.ceil(dayOfMonth / 7);
}

// Korean holidays (2025-2026)
const HOLIDAYS: Record<string, string> = {
  '2025-01-01': '신정',
  '2025-01-28': '설날',
  '2025-01-29': '설날',
  '2025-01-30': '설날',
  '2025-03-01': '삼일절',
  '2025-05-01': '근로자의 날',
  '2025-05-05': '어린이날',
  '2025-05-06': '대체휴일',
  '2025-06-06': '현충일',
  '2025-08-15': '광복절',
  '2025-10-03': '개천절',
  '2025-10-05': '추석',
  '2025-10-06': '추석',
  '2025-10-07': '추석',
  '2025-10-08': '대체휴일',
  '2025-10-09': '한글날',
  '2025-12-25': '크리스마스',
  '2026-01-01': '신정',
  '2026-02-16': '설날',
  '2026-02-17': '설날',
  '2026-02-18': '설날',
  '2026-03-01': '삼일절',
  '2026-05-01': '근로자의 날',
  '2026-05-05': '어린이날',
  '2026-05-24': '석가탄신일',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-09-24': '추석',
  '2026-09-25': '추석',
  '2026-09-26': '추석',
  '2026-10-03': '개천절',
  '2026-10-09': '한글날',
  '2026-12-25': '크리스마스',
};

export function isHoliday(dateStr: string): string | null {
  return HOLIDAYS[dateStr] || null;
}

// --- 주차/월별 그룹핑 ---

import { DateGroup } from '@/lib/types';

/** 월요일 기준 ISO 주차 번호 */
function getISOWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const dayOfWeek = d.getDay() || 7; // 일요일=7
  d.setDate(d.getDate() + 4 - dayOfWeek); // 해당 주의 목요일
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** "3월 4주차" 형태 라벨 */
function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  // 해당 월에서 몇 번째 주인지 계산
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstMonday = new Date(firstOfMonth);
  const dayOfWeek = firstMonday.getDay() || 7;
  if (dayOfWeek !== 1) firstMonday.setDate(firstMonday.getDate() + (8 - dayOfWeek));
  const weekInMonth = d < firstMonday ? 1 : Math.ceil((d.getDate() - firstMonday.getDate() + firstMonday.getDate()) / 7);
  const weekNum = Math.ceil(d.getDate() / 7);
  return `${month}월 ${weekNum}주차`;
}

/** 날짜 배열을 월요일 기준 주 단위로 그룹핑 */
export function groupDatesByWeek(dates: string[]): DateGroup[] {
  if (dates.length === 0) return [];
  const groups: DateGroup[] = [];
  let currentGroup: DateGroup | null = null;

  for (const date of dates) {
    const d = new Date(date);
    const year = d.getFullYear();
    const week = getISOWeek(date);
    const key = `${year}-W${String(week).padStart(2, '0')}`;

    if (!currentGroup || currentGroup.key !== key) {
      currentGroup = { key, label: getWeekLabel(date), dates: [] };
      groups.push(currentGroup);
    }
    currentGroup.dates.push(date);
  }
  return groups;
}

/** 날짜 배열을 월 단위로 그룹핑 */
export function groupDatesByMonth(dates: string[]): DateGroup[] {
  if (dates.length === 0) return [];
  const groups: DateGroup[] = [];
  let currentGroup: DateGroup | null = null;

  for (const date of dates) {
    const key = date.slice(0, 7); // "YYYY-MM"
    if (!currentGroup || currentGroup.key !== key) {
      const d = new Date(date);
      const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      currentGroup = { key, label, dates: [] };
      groups.push(currentGroup);
    }
    currentGroup.dates.push(date);
  }
  return groups;
}
