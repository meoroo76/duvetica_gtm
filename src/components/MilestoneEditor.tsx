'use client';

import { useState, useMemo } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { Milestone, getSeasonStyle } from '@/lib/types';

// 마일스톤 템플릿 (선택 시 자동 차수 부여)
const MILESTONE_TEMPLATES = [
  'KICK-OFF',
  'Category Strategy Report',
  'Fabric Development',
  'CAD Report',
  'Sample PLM',
  'Sample Lead Time',
  'Convention',
  'OTB Fix',
  'PR / PLM 완료',
  'PO 발행',
] as const;

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E',
];

interface MilestoneEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MilestoneEditor({ isOpen, onClose }: MilestoneEditorProps) {
  const { milestones, seasons, addMilestone, updateMilestone, deleteMilestone, currentUser } = useGTMStore();
  const sortedSeasons = useMemo(() => [...seasons].sort((a, b) => a.order - b.order), [seasons]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', startDate: '', endDate: '', color: '' });
  const [filterSeason, setFilterSeason] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // 신규 등록 폼
  const [addForm, setAddForm] = useState({
    season: sortedSeasons[0]?.id || '',
    template: '',
    customName: '',
    startDate: '',
    endDate: '',
    color: DEFAULT_COLORS[0],
  });

  const seasonOrder = useMemo(() => {
    const map: Record<string, number> = {};
    sortedSeasons.forEach((s, i) => { map[s.id] = i; });
    return map;
  }, [sortedSeasons]);

  const filtered = useMemo(() => {
    return milestones
      .filter((m) => filterSeason === 'all' || m.season === filterSeason)
      .sort((a, b) => {
        if (a.season !== b.season) return (seasonOrder[a.season] ?? 0) - (seasonOrder[b.season] ?? 0);
        return a.order - b.order;
      });
  }, [milestones, filterSeason, seasonOrder]);

  // 동일 시즌 동일 템플릿의 차수를 계산
  const getAutoName = (season: string, templateName: string): string => {
    if (!templateName) return '';
    // 해당 시즌에서 동일 기본명을 가진 마일스톤 개수 확인
    const baseName = templateName.replace(/\s*\(\d+차\)\s*$/, '').trim();
    const existing = milestones.filter((m) => {
      const mBase = m.name.replace(/\s*\(\d+차\)\s*$/, '').trim();
      return m.season === season && mBase === baseName;
    });

    if (existing.length === 0) return baseName;
    // 1개 이상 존재하면 차수 부여
    // 기존에 차수 없는 것이 있으면 그건 1차로 간주
    const maxOrder = existing.reduce((max, m) => {
      const match = m.name.match(/\((\d+)차\)/);
      return Math.max(max, match ? parseInt(match[1]) : 1);
    }, 1);
    return `${baseName} (${maxOrder + 1}차)`;
  };

  // 템플릿 선택 시 자동 이름 + 색상 설정
  const handleTemplateChange = (template: string) => {
    const autoName = getAutoName(addForm.season, template);
    const templateIdx = MILESTONE_TEMPLATES.indexOf(template as typeof MILESTONE_TEMPLATES[number]);
    const color = templateIdx >= 0 ? DEFAULT_COLORS[templateIdx % DEFAULT_COLORS.length] : addForm.color;
    setAddForm({ ...addForm, template, customName: autoName, color });
  };

  // 시즌 변경 시 자동 이름 재계산
  const handleSeasonChange = (season: string) => {
    const autoName = addForm.template ? getAutoName(season, addForm.template) : addForm.customName;
    setAddForm({ ...addForm, season, customName: autoName });
  };

  const handleAdd = () => {
    if (!currentUser) return;
    const name = addForm.customName.trim();
    if (!name || !addForm.startDate || !addForm.endDate) {
      alert('이름, 시작일, 종료일은 필수입니다.');
      return;
    }
    if (addForm.startDate > addForm.endDate) {
      alert('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }

    // order는 해당 시즌의 마지막 + 1
    const seasonMilestones = milestones.filter((m) => m.season === addForm.season);
    const maxOrder = seasonMilestones.reduce((max, m) => Math.max(max, m.order), -1);

    addMilestone({
      name,
      season: addForm.season,
      startDate: addForm.startDate,
      endDate: addForm.endDate,
      color: addForm.color,
      order: maxOrder + 1,
    });

    // 폼 초기화
    setAddForm({ season: addForm.season, template: '', customName: '', startDate: '', endDate: '', color: DEFAULT_COLORS[0] });
    setShowAddForm(false);
  };

  if (!isOpen) return null;

  const startEdit = (m: Milestone) => {
    setEditingId(m.id);
    setEditForm({ name: m.name, startDate: m.startDate, endDate: m.endDate, color: m.color });
  };

  const saveEdit = () => {
    if (!editingId || !currentUser) return;
    if (editForm.startDate > editForm.endDate) {
      alert('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }
    updateMilestone(editingId, {
      name: editForm.name,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      color: editForm.color,
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleDelete = (m: Milestone) => {
    const linkedTasks = useGTMStore.getState().tasks.filter((t) => t.milestone === m.id).length;
    const msg = linkedTasks > 0
      ? `"${m.name}" 마일스톤을 삭제하시겠습니까?\n연결된 업무 ${linkedTasks}건의 마일스톤 연결이 해제됩니다.`
      : `"${m.name}" 마일스톤을 삭제하시겠습니까?`;
    if (confirm(msg)) {
      deleteMilestone(m.id);
    }
  };

  const getDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
    return Math.round(diff) + 1;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[860px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">마일스톤 관리</h2>
            <p className="text-xs text-gray-500 mt-0.5">등록, 수정, 삭제 | 동일 마일스톤 추가 시 자동 차수 부여</p>
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
                {showAddForm ? '등록 취소' : '+ 새 마일스톤'}
              </button>
            )}
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value as typeof filterSeason)}
              className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
            >
              <option value="all">전체 시즌</option>
              {sortedSeasons.map((s) => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
              &times;
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && currentUser && (
          <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-200">
            <h3 className="text-sm font-bold text-gray-800 mb-3">마일스톤 등록</h3>
            <div className="grid grid-cols-6 gap-3">
              {/* 시즌 */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">시즌</label>
                <select
                  value={addForm.season}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900"
                >
                  {sortedSeasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.id}</option>
                  ))}
                </select>
              </div>

              {/* 템플릿 선택 */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">유형 선택</label>
                <select
                  value={addForm.template}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900"
                >
                  <option value="">직접 입력</option>
                  {MILESTONE_TEMPLATES.map((t) => {
                    const preview = getAutoName(addForm.season, t);
                    return (
                      <option key={t} value={t}>
                        {preview !== t ? `${t} → ${preview}` : t}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">이름</label>
                <input
                  value={addForm.customName}
                  onChange={(e) => setAddForm({ ...addForm, customName: e.target.value })}
                  placeholder="마일스톤명"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900"
                />
              </div>

              {/* 시작일 */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">시작일</label>
                <input
                  type="date"
                  value={addForm.startDate}
                  onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900"
                />
              </div>

              {/* 종료일 */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">종료일</label>
                <input
                  type="date"
                  value={addForm.endDate}
                  onChange={(e) => setAddForm({ ...addForm, endDate: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900"
                />
              </div>

              {/* 색상 + 등록 버튼 */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">색상</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={addForm.color}
                    onChange={(e) => setAddForm({ ...addForm, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <button
                    onClick={handleAdd}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium"
                  >
                    등록
                  </button>
                </div>
              </div>
            </div>

            {/* 미리보기 */}
            {addForm.customName && addForm.startDate && addForm.endDate && (
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-600 bg-white px-3 py-2 rounded border border-gray-200">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getSeasonStyle(addForm.season).badgeBg} ${getSeasonStyle(addForm.season).badgeText}`}>
                  {addForm.season}
                </span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: addForm.color }} />
                <span className="font-medium text-gray-800">{addForm.customName}</span>
                <span className="text-gray-400">|</span>
                <span>{addForm.startDate} ~ {addForm.endDate}</span>
                <span className="text-gray-400">({getDuration(addForm.startDate, addForm.endDate)}일)</span>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-16">시즌</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">마일스톤</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-28">시작일</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-28">종료일</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 w-16">기간</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 w-12">색상</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 w-28">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-gray-400">
                    등록된 마일스톤이 없습니다
                  </td>
                </tr>
              )}
              {filtered.map((m) => {
                const isEditing = editingId === m.id;
                return (
                  <tr key={m.id} className={`border-b border-gray-100 ${isEditing ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getSeasonStyle(m.season).badgeBg} ${getSeasonStyle(m.season).badgeText}`}>
                        {m.season}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm text-gray-900 focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <span className="font-medium text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                          {m.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.startDate}
                          onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                          className="px-2 py-1 border border-blue-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.startDate}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.endDate}
                          onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                          className="px-2 py-1 border border-blue-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <span className="text-xs text-gray-600">{m.endDate}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-xs text-gray-500">
                        {getDuration(isEditing ? editForm.startDate : m.startDate, isEditing ? editForm.endDate : m.endDate)}일
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isEditing ? (
                        <input
                          type="color"
                          value={editForm.color}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          className="w-7 h-7 rounded cursor-pointer border-0"
                        />
                      ) : (
                        <span className="inline-block w-5 h-5 rounded" style={{ backgroundColor: m.color }} />
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {!currentUser ? (
                        <span className="text-[10px] text-gray-400">읽기전용</span>
                      ) : isEditing ? (
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={saveEdit}
                            className="text-[11px] px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-[11px] px-2 py-0.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => startEdit(m)}
                            className="text-[11px] px-2 py-0.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(m)}
                            className="text-[11px] px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50"
                          >
                            삭제
                          </button>
                        </div>
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
          <span className="text-xs text-gray-500">총 {filtered.length}개 마일스톤</span>
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
