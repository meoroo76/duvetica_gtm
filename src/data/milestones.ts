import { Milestone, Season } from '@/lib/types';

// 마일스톤 템플릿 (새 시즌 생성 시 사용)
export const MILESTONE_TEMPLATE = [
  { name: 'KICK-OFF', color: '#EF4444', durationDays: 1 },
  { name: 'Category Strategy Report', color: '#F97316', durationDays: 12 },
  { name: 'Fabric Development', color: '#F59E0B', durationDays: 19 },
  { name: 'CAD Report', color: '#84CC16', durationDays: 12 },
  { name: '1st Sample PLM', color: '#22C55E', durationDays: 12 },
  { name: '1st Sample Lead Time', color: '#14B8A6', durationDays: 42 },
  { name: '1st Convention', color: '#06B6D4', durationDays: 2 },
  { name: '2nd Sample PLM', color: '#3B82F6', durationDays: 17 },
  { name: '2nd Sample Lead Time', color: '#6366F1', durationDays: 49 },
  { name: '2nd Convention', color: '#8B5CF6', durationDays: 2 },
  { name: 'OTB Fix', color: '#A855F7', durationDays: 12 },
  { name: 'PR / PLM 완료', color: '#EC4899', durationDays: 5 },
  { name: 'PO 발행', color: '#F43F5E', durationDays: 5 },
];

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateMilestonesForSeason(seasonId: string, kickoffDate: string): Milestone[] {
  const milestones: Milestone[] = [];
  let currentDate = kickoffDate;

  for (let i = 0; i < MILESTONE_TEMPLATE.length; i++) {
    const tmpl = MILESTONE_TEMPLATE[i];
    const endDate = addDaysToDate(currentDate, tmpl.durationDays - 1);
    milestones.push({
      id: `${seasonId.toLowerCase()}-${tmpl.name.toLowerCase().replace(/[\s\/]+/g, '-')}`,
      name: tmpl.name,
      season: seasonId,
      startDate: currentDate,
      endDate,
      color: tmpl.color,
      order: i,
    });
    currentDate = addDaysToDate(endDate, 1);
  }

  return milestones;
}

// 기본 시즌 정의
export const DEFAULT_SEASONS: Season[] = [
  {
    id: '26FW',
    year: 2026,
    type: 'FW',
    startDate: '2025-05-16',
    endDate: '2026-01-05',
    order: 0,
    color: '#F97316',
  },
  {
    id: '27SS',
    year: 2027,
    type: 'SS',
    startDate: '2025-10-13',
    endDate: '2026-05-29',
    order: 1,
    color: '#3B82F6',
  },
];

export const DEFAULT_MILESTONES: Milestone[] = [
  // === 26FW Season ===
  {
    id: 'fw-kickoff',
    name: 'KICK-OFF',
    season: '26FW',
    startDate: '2025-05-16',
    endDate: '2025-05-16',
    color: '#EF4444',
    order: 0,
  },
  {
    id: 'fw-category-strategy',
    name: 'Category Strategy Report',
    season: '26FW',
    startDate: '2025-05-29',
    endDate: '2025-06-11',
    color: '#F97316',
    order: 1,
  },
  {
    id: 'fw-fabric-dev',
    name: 'Fabric Development',
    season: '26FW',
    startDate: '2025-06-12',
    endDate: '2025-07-01',
    color: '#F59E0B',
    order: 2,
  },
  {
    id: 'fw-cad-report',
    name: 'CAD Report',
    season: '26FW',
    startDate: '2025-07-02',
    endDate: '2025-07-11',
    color: '#84CC16',
    order: 3,
  },
  {
    id: 'fw-1st-sample-plm',
    name: '1st Sample PLM',
    season: '26FW',
    startDate: '2025-07-14',
    endDate: '2025-07-25',
    color: '#22C55E',
    order: 4,
  },
  {
    id: 'fw-1st-sample-lt',
    name: '1st Sample Lead Time',
    season: '26FW',
    startDate: '2025-07-26',
    endDate: '2025-08-28',
    color: '#14B8A6',
    order: 5,
  },
  {
    id: 'fw-1st-convention',
    name: '1st Convention',
    season: '26FW',
    startDate: '2025-09-01',
    endDate: '2025-09-02',
    color: '#06B6D4',
    order: 6,
  },
  {
    id: 'fw-2nd-sample-plm',
    name: '2nd Sample PLM',
    season: '26FW',
    startDate: '2025-09-03',
    endDate: '2025-09-19',
    color: '#3B82F6',
    order: 7,
  },
  {
    id: 'fw-2nd-sample-lt',
    name: '2nd Sample Lead Time',
    season: '26FW',
    startDate: '2025-09-20',
    endDate: '2025-11-08',
    color: '#6366F1',
    order: 8,
  },
  {
    id: 'fw-2nd-convention',
    name: '2nd Convention',
    season: '26FW',
    startDate: '2025-11-11',
    endDate: '2025-11-12',
    color: '#8B5CF6',
    order: 9,
  },
  {
    id: 'fw-otb-fix',
    name: 'OTB Fix',
    season: '26FW',
    startDate: '2025-12-08',
    endDate: '2025-12-22',
    color: '#A855F7',
    order: 10,
  },
  {
    id: 'fw-pr-plm',
    name: 'PR / PLM 완료',
    season: '26FW',
    startDate: '2025-12-23',
    endDate: '2025-12-29',
    color: '#EC4899',
    order: 11,
  },
  {
    id: 'fw-po',
    name: 'PO 발행',
    season: '26FW',
    startDate: '2025-12-30',
    endDate: '2026-01-05',
    color: '#F43F5E',
    order: 12,
  },

  // === 27SS Season ===
  {
    id: 'ss-kickoff',
    name: 'KICK-OFF',
    season: '27SS',
    startDate: '2025-10-13',
    endDate: '2025-10-13',
    color: '#EF4444',
    order: 0,
  },
  {
    id: 'ss-category-strategy',
    name: 'Category Strategy Report',
    season: '27SS',
    startDate: '2025-10-27',
    endDate: '2025-11-07',
    color: '#F97316',
    order: 1,
  },
  {
    id: 'ss-fabric-dev',
    name: 'Fabric Development',
    season: '27SS',
    startDate: '2025-11-10',
    endDate: '2025-11-28',
    color: '#F59E0B',
    order: 2,
  },
  {
    id: 'ss-cad-report',
    name: 'CAD Report',
    season: '27SS',
    startDate: '2025-12-01',
    endDate: '2025-12-12',
    color: '#84CC16',
    order: 3,
  },
  {
    id: 'ss-1st-sample-plm',
    name: '1st Sample PLM',
    season: '27SS',
    startDate: '2025-12-15',
    endDate: '2025-12-26',
    color: '#22C55E',
    order: 4,
  },
  {
    id: 'ss-1st-sample-lt',
    name: '1st Sample Lead Time',
    season: '27SS',
    startDate: '2025-12-27',
    endDate: '2026-02-06',
    color: '#14B8A6',
    order: 5,
  },
  {
    id: 'ss-1st-convention',
    name: '1st Convention',
    season: '27SS',
    startDate: '2026-02-09',
    endDate: '2026-02-10',
    color: '#06B6D4',
    order: 6,
  },
  {
    id: 'ss-2nd-sample-plm',
    name: '2nd Sample PLM',
    season: '27SS',
    startDate: '2026-02-11',
    endDate: '2026-02-27',
    color: '#3B82F6',
    order: 7,
  },
  {
    id: 'ss-2nd-sample-lt',
    name: '2nd Sample Lead Time',
    season: '27SS',
    startDate: '2026-02-28',
    endDate: '2026-04-17',
    color: '#6366F1',
    order: 8,
  },
  {
    id: 'ss-2nd-convention',
    name: '2nd Convention',
    season: '27SS',
    startDate: '2026-04-20',
    endDate: '2026-04-21',
    color: '#8B5CF6',
    order: 9,
  },
  {
    id: 'ss-otb-fix',
    name: 'OTB Fix',
    season: '27SS',
    startDate: '2026-05-04',
    endDate: '2026-05-15',
    color: '#A855F7',
    order: 10,
  },
  {
    id: 'ss-pr-plm',
    name: 'PR / PLM 완료',
    season: '27SS',
    startDate: '2026-05-18',
    endDate: '2026-05-22',
    color: '#EC4899',
    order: 11,
  },
  {
    id: 'ss-po',
    name: 'PO 발행',
    season: '27SS',
    startDate: '2026-05-25',
    endDate: '2026-05-29',
    color: '#F43F5E',
    order: 12,
  },
];
