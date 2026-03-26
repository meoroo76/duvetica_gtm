export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  season: '27SS' | '26FW';
  department: Department;
  content: string;
  milestone?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  createdBy: string;
  updatedAt: string;
}

export type Department = '기획' | '디자인' | '소재' | '소싱';

export interface Milestone {
  id: string;
  name: string;
  season: '27SS' | '26FW';
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
};

export const STATUS_LABELS: Record<Task['status'], string> = {
  pending: '예정',
  in_progress: '진행중',
  completed: '완료',
  delayed: '지연',
};
