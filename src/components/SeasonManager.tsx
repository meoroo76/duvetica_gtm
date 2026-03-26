'use client';

import { useState } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { Season, getSeasonStyle } from '@/lib/types';

interface SeasonManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i - 1);

export default function SeasonManager({ isOpen, onClose }: SeasonManagerProps) {
  const { seasons, currentUser, addSeason, deleteSeason, milestones, tasks } = useGTMStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    year: CURRENT_YEAR + 1,
    type: 'SS' as 'SS' | 'FW',
    kickoffDate: '',
  });

  if (!isOpen) return null;

  const seasonId = `${String(addForm.year).slice(2)}${addForm.type}`;
  const isDuplicate = seasons.some((s) => s.id === seasonId);

  const handleAdd = () => {
    if (!currentUser) return;
    if (!addForm.kickoffDate) {
      alert('KICK-OFF 날짜를 입력해주세요.');
      return;
    }
    if (isDuplicate) {
      alert(`${seasonId} 시즌이 이미 존재합니다.`);
      return;
    }

    // 시즌 종료일은 마일스톤 자동 생성 후 마지막 마일스톤 종료일 기준으로 설정
    // 일단 kickoff + 약 7개월로 설정 (나중에 마일스톤 기반 자동 계산)
    const endDate = new Date(addForm.kickoffDate);
    endDate.setMonth(endDate.getMonth() + 7);
    const endDateStr = endDate.toISOString().slice(0, 10);

    const newSeason: Season = {
      id: seasonId,
      year: addForm.year,
      type: addForm.type,
      startDate: addForm.kickoffDate,
      endDate: endDateStr,
      order: seasons.length,
      color: addForm.type === 'SS' ? '#3B82F6' : '#F97316',
    };

    addSeason(newSeason);
    setShowAddForm(false);
    setAddForm({ year: CURRENT_YEAR + 1, type: 'SS', kickoffDate: '' });
  };

  const handleDelete = (season: Season) => {
    const taskCount = tasks.filter((t) => t.season === season.id).length;
    const msCount = milestones.filter((m) => m.season === season.id).length;
    const msg = `"${season.id}" 시즌을 삭제하시겠습니까?\n\n` +
      `- 마일스톤 ${msCount}개 삭제\n` +
      `- 업무 ${taskCount}건 삭제\n\n` +
      `이 작업은 되돌릴 수 없습니다.`;

    if (confirm(msg)) {
      deleteSeason(season.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">시즌 관리</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              새 시즌 추가 시 기본 마일스톤 13개가 자동 생성됩니다
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                  showAddForm
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {showAddForm ? '취소' : '+ 새 시즌'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
              &times;
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && currentUser && (
          <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-200">
            <h3 className="text-sm font-bold text-gray-800 mb-3">새 시즌 추가</h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">년도</label>
                <select
                  value={addForm.year}
                  onChange={(e) => setAddForm({ ...addForm, year: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">시즌 타입</label>
                <select
                  value={addForm.type}
                  onChange={(e) => setAddForm({ ...addForm, type: e.target.value as 'SS' | 'FW' })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900"
                >
                  <option value="SS">SS (Spring/Summer)</option>
                  <option value="FW">FW (Fall/Winter)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">KICK-OFF 날짜</label>
                <input
                  type="date"
                  value={addForm.kickoffDate}
                  onChange={(e) => setAddForm({ ...addForm, kickoffDate: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAdd}
                  disabled={isDuplicate || !addForm.kickoffDate}
                  className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  생성
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-600 bg-white px-3 py-2 rounded border border-gray-200">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                addForm.type === 'FW' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {seasonId}
              </span>
              {isDuplicate ? (
                <span className="text-red-500 font-medium">이미 존재하는 시즌입니다</span>
              ) : (
                <>
                  <span className="font-medium text-gray-800">{addForm.year}년 {addForm.type === 'SS' ? '봄/여름' : '가을/겨울'}</span>
                  {addForm.kickoffDate && (
                    <>
                      <span className="text-gray-400">|</span>
                      <span>KICK-OFF: {addForm.kickoffDate}</span>
                      <span className="text-gray-400">|</span>
                      <span>마일스톤 13개 자동 생성</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Season list */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-20">시즌</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">기간</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 w-24">마일스톤</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 w-20">업무</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 w-20">작업</th>
              </tr>
            </thead>
            <tbody>
              {seasons.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-gray-400">
                    등록된 시즌이 없습니다
                  </td>
                </tr>
              )}
              {[...seasons].sort((a, b) => a.order - b.order).map((season) => {
                const style = getSeasonStyle(season.id);
                const msCount = milestones.filter((m) => m.season === season.id).length;
                const taskCount = tasks.filter((t) => t.season === season.id).length;

                return (
                  <tr key={season.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded ${style.badgeBg} ${style.badgeText}`}>
                        {season.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">
                        {season.startDate} ~ {season.endDate}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-600">{msCount}개</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-600">{taskCount}건</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {currentUser ? (
                        <button
                          onClick={() => handleDelete(season)}
                          className="text-[11px] px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50"
                        >
                          삭제
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400">읽기전용</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center bg-gray-50 rounded-b-xl">
          <span className="text-xs text-gray-500">총 {seasons.length}개 시즌</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
