'use client';

import { useMemo } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { formatDate } from '@/lib/dateUtils';

interface HeaderProps {
  activeTab: 'calendar' | 'dashboard' | 'guide';
  onTabChange: (tab: 'calendar' | 'dashboard' | 'guide') => void;
  onOpenMilestones: () => void;
  onOpenExcel: () => void;
  onOpenNotifications: () => void;
}

export default function Header({
  activeTab,
  onTabChange,
  onOpenMilestones,
  onOpenExcel,
  onOpenNotifications,
}: HeaderProps) {
  const { currentUser, logout, tasks, syncing, lastSyncedAt, syncToServer } = useGTMStore();
  const today = formatDate(new Date());

  const notificationCount = useMemo(() => {
    const overdue = tasks.filter(
      (t) => t.date < today && t.status !== 'completed' && t.status !== 'delayed'
    ).length;
    const delayed = tasks.filter((t) => t.status === 'delayed').length;
    const todayTasks = tasks.filter(
      (t) => t.date === today && t.status !== 'completed'
    ).length;
    return overdue + delayed + todayTasks;
  }, [tasks, today]);

  return (
    <header className="h-14 bg-gray-900 text-white flex items-center px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight">DUVETICA</h1>
        <span className="text-xs text-gray-400 border-l border-gray-700 pl-3">
          GTM Schedule
        </span>
      </div>

      <nav className="flex items-center gap-1 ml-8">
        <button
          onClick={() => onTabChange('calendar')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'calendar'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => onTabChange('dashboard')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onTabChange('guide')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'guide'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Guide
        </button>
      </nav>

      {/* Action buttons */}
      <div className="flex items-center gap-2 ml-6">
        <button
          onClick={onOpenMilestones}
          className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 transition-colors"
        >
          Milestone
        </button>
        <button
          onClick={onOpenExcel}
          className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 transition-colors"
        >
          Excel
        </button>
        <button
          onClick={onOpenNotifications}
          className="relative text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 transition-colors"
        >
          알림
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* Sync status */}
        {currentUser && (
          <div className="flex items-center gap-2">
            {syncing ? (
              <span className="text-[10px] text-yellow-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                동기화 중...
              </span>
            ) : lastSyncedAt ? (
              <button
                onClick={() => syncToServer()}
                className="text-[10px] text-green-400 flex items-center gap-1 hover:text-green-300"
                title={`마지막 동기화: ${new Date(lastSyncedAt).toLocaleString('ko-KR')}`}
              >
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                저장됨
              </button>
            ) : (
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                로컬
              </span>
            )}
          </div>
        )}

        {currentUser ? (
          <>
            <span className="text-sm text-gray-300">
              {currentUser.displayName}
            </span>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1 rounded"
            >
              로그아웃
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-500">읽기 전용</span>
        )}
      </div>
    </header>
  );
}
