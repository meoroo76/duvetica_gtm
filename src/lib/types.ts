export interface Season {
  id: string;        // e.g., '27SS', '27FW', '28SS'
  year: number;      // e.g., 2027
  type: 'SS' | 'FW';
  startDate: string; // 시즌 시작일 YYYY-MM-DD
  endDate: string;   // 시즌 종료일 YYYY-MM-DD
  order: number;     // 정렬 순서
  color: string;     // 시즌 테마 색상
}

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  season: string;
  department: Department;
  content: string;
  milestone?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'rescheduled';
  createdBy: string;
  updatedAt: string;
  endDate?: string;     // YYYY-MM-DD, 설정 시 기간 태스크
  barColor?: string;    // 기간 태스크 셀 배경색 (hex)
  linkedFrom?: string;  // 원본 태스크 ID (이 태스크가 어디서 변경되었는지)
  linkedTo?: string;    // 변경된 태스크 ID (이 태스크가 어디로 변경되었는지)
}

export type Department = '기획' | '디자인' | '소재' | '소싱';

export type ViewMode = 'daily' | 'weekly' | 'monthly';

export interface DateGroup {
  key: string;       // 고유 키 (e.g., "2026-W13", "2026-03")
  label: string;     // 표시 라벨 (e.g., "3월 4주차", "2026.03")
  dates: string[];   // 포함된 날짜 배열
}

export interface Milestone {
  id: string;
  name: string;
  season: string;
  startDate: string;
  endDate: string;
  color: string;
  order: number;
}

export interface User {
  username: string;
  displayName: string;
}

export const DEPARTMENTS: Department[] = ['기획', '디자인', '소재', '소싱'];

export const DEPARTMENT_COLORS: Record<Department, string> = {
  '기획': '#3B82F6',
  '디자인': '#8B5CF6',
  '소재': '#F59E0B',
  '소싱': '#10B981',
};

export const STATUS_COLORS: Record<Task['status'], string> = {
  pending: '#94A3B8',
  in_progress: '#3B82F6',
  completed: '#10B981',
  delayed: '#EF4444',
  rescheduled: '#9CA3AF',
};

export const STATUS_LABELS: Record<Task['status'], string> = {
  pending: '예정',
  in_progress: '진행중',
  completed: '완료',
  delayed: '지연',
  rescheduled: '변경됨',
};

// 기간 일정 색상 팔레트
export const PERIOD_COLORS: string[] = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#6366F1', '#14B8A6',
];

// 기본 시즌 색상 팔레트
export const SEASON_COLORS: Record<string, { bg: string; text: string; border: string; color: string }> = {
  SS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', color: '#3B82F6' },
  FW: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', color: '#F97316' },
};

export function getSeasonStyle(seasonId: string): { bg: string; text: string; border: string; badgeBg: string; badgeText: string; color: string } {
  const type = seasonId.endsWith('FW') ? 'FW' : 'SS';
  const base = SEASON_COLORS[type];
  return {
    ...base,
    badgeBg: type === 'FW' ? 'bg-orange-100' : 'bg-blue-100',
    badgeText: type === 'FW' ? 'text-orange-600' : 'text-blue-600',
  };
}
