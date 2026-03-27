'use client';

import { useState, useEffect } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import Header from './Header';
import CalendarGrid from './CalendarGrid';
import Dashboard from './Dashboard';
import UserGuide from './UserGuide';
import LoginModal from './LoginModal';
import MilestoneEditor from './MilestoneEditor';
import SeasonManager from './SeasonManager';
import ExcelManager from './ExcelManager';
import NotificationPanel from './NotificationPanel';

export default function AppShell() {
  const { currentUser, initializeData } = useGTMStore();
  const [activeTab, setActiveTab] = useState<'calendar' | 'dashboard' | 'guide'>('calendar');
  const [showLogin, setShowLogin] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showSeasons, setShowSeasons] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [visibleYear, setVisibleYear] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    initializeData();
  }, [initializeData]);

  // Close login modal when user logs in
  useEffect(() => {
    if (currentUser) setShowLogin(false);
  }, [currentUser]);

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMilestones={() => setShowMilestones(true)}
        onOpenSeasons={() => setShowSeasons(true)}
        onOpenExcel={() => setShowExcel(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        visibleYear={visibleYear}
      />

      {!currentUser && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-1.5 flex items-center justify-between shrink-0">
          <span className="text-xs text-amber-700">
            읽기 전용 모드입니다. 일정을 수정하려면 로그인하세요.
          </span>
          <button
            data-testid="open-login-btn"
            onClick={() => setShowLogin(true)}
            className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700"
          >
            로그인
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activeTab === 'calendar' && <CalendarGrid onVisibleYearChange={setVisibleYear} />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'guide' && <UserGuide />}
      </div>

      {/* Modals */}
      {showLogin && !currentUser && <LoginModal onClose={() => setShowLogin(false)} />}
      <MilestoneEditor isOpen={showMilestones} onClose={() => setShowMilestones(false)} />
      <SeasonManager isOpen={showSeasons} onClose={() => setShowSeasons(false)} />
      <ExcelManager isOpen={showExcel} onClose={() => setShowExcel(false)} />
      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
}
