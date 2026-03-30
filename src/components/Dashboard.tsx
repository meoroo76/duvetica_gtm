'use client';

import { useMemo } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { DEPARTMENTS, DEPARTMENT_COLORS, STATUS_COLORS, STATUS_LABELS, Task, getSeasonStyle } from '@/lib/types';
import { formatDate } from '@/lib/dateUtils';

export default function Dashboard() {
  const { tasks, milestones, seasons } = useGTMStore();
  const today = formatDate(new Date());
  const sortedSeasons = useMemo(() => [...seasons].sort((a, b) => a.order - b.order), [seasons]);

  const stats = useMemo(() => {
    const result: Record<string, {
      total: number;
      byStatus: Record<Task['status'], number>;
      byDept: Record<string, number>;
      overdue: Task[];
      upcoming: Task[];
    }> = {};

    for (const season of sortedSeasons) {
      result[season.id] = {
        total: 0,
        byStatus: { pending: 0, in_progress: 0, completed: 0, delayed: 0, rescheduled: 0 },
        byDept: {},
        overdue: [],
        upcoming: [],
      };
    }

    for (const task of tasks) {
      const s = result[task.season];
      if (!s) continue;
      s.total++;
      s.byStatus[task.status]++;
      s.byDept[task.department] = (s.byDept[task.department] || 0) + 1;

      if (task.date < today && task.status !== 'completed') {
        s.overdue.push(task);
      }
      if (task.date >= today && task.date <= addDays(today, 7)) {
        s.upcoming.push(task);
      }
    }
    return result;
  }, [tasks, today, sortedSeasons]);

  const milestoneProgress = useMemo(() => {
    return milestones.map((m) => {
      const mTasks = tasks.filter((t) => t.milestone === m.id);
      const completed = mTasks.filter((t) => t.status === 'completed').length;
      const total = mTasks.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      let status: 'upcoming' | 'active' | 'completed' | 'overdue' = 'upcoming';
      if (today > m.endDate && pct < 100) status = 'overdue';
      else if (today > m.endDate && pct === 100) status = 'completed';
      else if (today >= m.startDate && today <= m.endDate) status = 'active';

      return { ...m, completed, total, pct, status };
    });
  }, [milestones, tasks, today]);

  const allUpcoming = useMemo(() => {
    return Object.values(stats).flatMap((s) => s.upcoming).sort((a, b) => a.date.localeCompare(b.date));
  }, [stats]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-gray-900">Dashboard</h2>

      {/* Season summary cards */}
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${Math.min(sortedSeasons.length, 4)}, 1fr)` }}>
        {sortedSeasons.map((season) => {
          const s = stats[season.id];
          if (!s) return null;
          const pct = s.total > 0
            ? Math.round((s.byStatus.completed / s.total) * 100)
            : 0;
          const style = getSeasonStyle(season.id);
          return (
            <div
              key={season.id}
              className={`rounded-xl p-5 border ${style.border} ${style.bg}/50`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold text-lg ${style.text}`}>
                  {season.id}
                </h3>
                <span className="text-2xl font-bold text-gray-900">{pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: style.color,
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(Object.keys(STATUS_LABELS) as Task['status'][]).map((st) => (
                  <div key={st}>
                    <div
                      className="text-lg font-bold"
                      style={{ color: STATUS_COLORS[st] }}
                    >
                      {s.byStatus[st]}
                    </div>
                    <div className="text-[10px] text-gray-500">{STATUS_LABELS[st]}</div>
                  </div>
                ))}
              </div>
              {s.overdue.length > 0 && (
                <div className="mt-3 p-2 bg-red-50 rounded-lg">
                  <span className="text-xs font-medium text-red-600">
                    {s.overdue.length}건 지연
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Department breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-sm text-gray-700 mb-3">부서별 업무 현황</h3>
        <div className="grid grid-cols-4 gap-3">
          {DEPARTMENTS.map((dept) => {
            const deptTasks = tasks.filter((t) => t.department === dept);
            const completed = deptTasks.filter((t) => t.status === 'completed').length;
            const total = deptTasks.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <div key={dept} className="text-center p-3 rounded-lg bg-gray-50">
                <div
                  className="text-sm font-bold mb-1"
                  style={{ color: DEPARTMENT_COLORS[dept] }}
                >
                  {dept}
                </div>
                <div className="text-2xl font-bold text-gray-900">{pct}%</div>
                <div className="text-[10px] text-gray-500">
                  {completed}/{total}건 완료
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: DEPARTMENT_COLORS[dept],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-sm text-gray-700 mb-3">마일스톤 진행률</h3>
        <div className="space-y-1">
          {milestoneProgress.map((m) => {
            const style = getSeasonStyle(m.season);
            return (
              <div key={m.id} className="flex items-center gap-3 py-1.5">
                <span className={`text-[10px] font-medium w-10 text-center px-1 py-0.5 rounded ${style.badgeBg} ${style.badgeText}`}>
                  {m.season}
                </span>
                <span className="text-xs text-gray-700 w-[160px] truncate" title={m.name}>
                  {m.name}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${m.pct}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium w-10 text-right text-gray-600">
                  {m.pct}%
                </span>
                <span
                  className={`text-[10px] w-12 text-center px-1 py-0.5 rounded ${
                    m.status === 'completed'
                      ? 'bg-green-100 text-green-600'
                      : m.status === 'active'
                      ? 'bg-blue-100 text-blue-600'
                      : m.status === 'overdue'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {m.status === 'completed'
                    ? '완료'
                    : m.status === 'active'
                    ? '진행중'
                    : m.status === 'overdue'
                    ? '지연'
                    : '예정'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming tasks */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-sm text-gray-700 mb-3">
          향후 7일 내 업무 ({allUpcoming.length}건)
        </h3>
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {allUpcoming.map((t) => {
            const style = getSeasonStyle(t.season);
            return (
              <div key={t.id} className="flex items-center gap-2 text-xs py-1">
                <span className="text-gray-400 w-14">{t.date.slice(5)}</span>
                <span className={`w-8 text-center px-1 py-0.5 rounded text-[10px] font-medium ${style.badgeBg} ${style.badgeText}`}>
                  {t.season}
                </span>
                <span
                  className="w-10 text-center text-[10px] font-medium"
                  style={{ color: DEPARTMENT_COLORS[t.department] }}
                >
                  {t.department}
                </span>
                <span className="flex-1 truncate text-gray-700">{t.content}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[t.status] }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
