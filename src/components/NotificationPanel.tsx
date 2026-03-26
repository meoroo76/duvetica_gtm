'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { Task, DEPARTMENT_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/types';
import { formatDate } from '@/lib/dateUtils';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Notification {
  id: string;
  type: 'overdue' | 'today' | 'upcoming' | 'milestone_start' | 'milestone_end';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  date: string;
  task?: Task;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { tasks, milestones } = useGTMStore();
  const today = formatDate(new Date());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];

    // Overdue tasks (critical)
    const overdue = tasks.filter(
      (t) => t.date < today && t.status !== 'completed' && t.status !== 'delayed'
    );
    for (const t of overdue) {
      const daysLate = Math.round(
        (new Date(today).getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      notifs.push({
        id: `overdue_${t.id}`,
        type: 'overdue',
        severity: 'critical',
        title: `[지연 D+${daysLate}] ${t.content}`,
        description: `${t.season} ${t.department} | 예정일: ${t.date}`,
        date: t.date,
        task: t,
      });
    }

    // Already delayed tasks
    const delayed = tasks.filter((t) => t.status === 'delayed');
    for (const t of delayed) {
      notifs.push({
        id: `delayed_${t.id}`,
        type: 'overdue',
        severity: 'critical',
        title: `[지연] ${t.content}`,
        description: `${t.season} ${t.department} | 예정일: ${t.date}`,
        date: t.date,
        task: t,
      });
    }

    // Today's tasks (warning)
    const todayTasks = tasks.filter((t) => t.date === today && t.status !== 'completed');
    for (const t of todayTasks) {
      notifs.push({
        id: `today_${t.id}`,
        type: 'today',
        severity: 'warning',
        title: `[오늘] ${t.content}`,
        description: `${t.season} ${t.department}`,
        date: t.date,
        task: t,
      });
    }

    // Upcoming tasks (next 3 days)
    const upcoming = tasks.filter((t) => {
      const diff = (new Date(t.date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 3 && t.status !== 'completed';
    });
    for (const t of upcoming) {
      const daysUntil = Math.round(
        (new Date(t.date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      );
      notifs.push({
        id: `upcoming_${t.id}`,
        type: 'upcoming',
        severity: 'info',
        title: `[D-${daysUntil}] ${t.content}`,
        description: `${t.season} ${t.department} | ${t.date}`,
        date: t.date,
        task: t,
      });
    }

    // Milestone starts within 3 days
    for (const m of milestones) {
      const diff = (new Date(m.startDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
      if (diff >= 0 && diff <= 3) {
        notifs.push({
          id: `ms_start_${m.id}`,
          type: 'milestone_start',
          severity: diff === 0 ? 'warning' : 'info',
          title: diff === 0 ? `[오늘 시작] ${m.name}` : `[D-${Math.round(diff)}] ${m.name} 시작`,
          description: `${m.season} | ${m.startDate} ~ ${m.endDate}`,
          date: m.startDate,
        });
      }

      // Milestone ending within 3 days
      const diffEnd = (new Date(m.endDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
      if (diffEnd >= 0 && diffEnd <= 3) {
        const mTasks = tasks.filter((t) => t.milestone === m.id);
        const incomplete = mTasks.filter((t) => t.status !== 'completed').length;
        if (incomplete > 0) {
          notifs.push({
            id: `ms_end_${m.id}`,
            type: 'milestone_end',
            severity: 'warning',
            title: diffEnd === 0 ? `[오늘 마감] ${m.name}` : `[마감 D-${Math.round(diffEnd)}] ${m.name}`,
            description: `${m.season} | 미완료 업무 ${incomplete}건`,
            date: m.endDate,
          });
        }
      }
    }

    // Sort: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    notifs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return notifs;
  }, [tasks, milestones, today]);

  const activeNotifs = notifications.filter((n) => !dismissed.has(n.id));

  // Send browser notification for critical items
  const sendBrowserNotification = useCallback(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const criticals = activeNotifs.filter((n) => n.severity === 'critical');
    if (criticals.length > 0) {
      new Notification('DUVETICA GTM - 지연 알림', {
        body: `${criticals.length}건의 지연된 업무가 있습니다.`,
        icon: '/favicon.ico',
      });
    }
  }, [activeNotifs]);

  useEffect(() => {
    if (isOpen) sendBrowserNotification();
  }, [isOpen, sendBrowserNotification]);

  if (!isOpen) return null;

  const severityStyles = {
    critical: 'border-l-red-500 bg-red-50/50',
    warning: 'border-l-amber-500 bg-amber-50/50',
    info: 'border-l-blue-500 bg-blue-50/50',
  };

  const severityIcons = {
    critical: '!',
    warning: '!',
    info: 'i',
  };

  const severityIconStyles = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  const criticalCount = activeNotifs.filter((n) => n.severity === 'critical').length;
  const warningCount = activeNotifs.filter((n) => n.severity === 'warning').length;
  const infoCount = activeNotifs.filter((n) => n.severity === 'info').length;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={onClose}>
      <div
        className="bg-white w-[420px] h-full shadow-2xl flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">알림</h2>
            <p className="text-xs text-gray-500 mt-0.5">{activeNotifs.length}건의 알림</p>
          </div>
          <div className="flex items-center gap-2">
            {activeNotifs.length > 0 && (
              <button
                onClick={() => setDismissed(new Set(notifications.map((n) => n.id)))}
                className="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-300 rounded"
              >
                모두 읽음
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
        </div>

        {/* Summary badges */}
        <div className="px-5 py-2 flex gap-2 border-b border-gray-100">
          {criticalCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
              긴급 {criticalCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              주의 {warningCount}
            </span>
          )}
          {infoCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
              예정 {infoCount}
            </span>
          )}
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {activeNotifs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              알림이 없습니다
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {activeNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`border-l-4 rounded-r-lg px-3 py-2.5 ${severityStyles[n.severity]} relative group`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold ${severityIconStyles[n.severity]}`}
                    >
                      {severityIcons[n.severity]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 leading-tight">{n.title}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{n.description}</div>
                    </div>
                    <button
                      onClick={() => setDismissed((prev) => new Set([...prev, n.id]))}
                      className="text-gray-300 hover:text-gray-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="읽음 처리"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            지연/당일/D-3 이내 업무 및 마일스톤을 자동으로 알려드립니다
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
