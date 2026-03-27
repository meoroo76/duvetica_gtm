'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { Department, DEPARTMENTS, DEPARTMENT_COLORS, STATUS_COLORS, Task, getSeasonStyle } from '@/lib/types';
import {
  generateDateRange,
  getDayOfWeekKR,
  isWeekend,
  isToday,
  isHoliday,
} from '@/lib/dateUtils';
import TaskModal from './TaskModal';

const ROW_HEIGHT = 32;
const VISIBLE_BUFFER = 20;

interface DragState {
  task: Task;
  originDate: string;
  originSeason: string;
  originDept: Department;
}

interface CalendarGridProps {
  onVisibleYearChange?: (year: string) => void;
}

export default function CalendarGrid({ onVisibleYearChange }: CalendarGridProps) {
  const { tasks, milestones, seasons, currentUser, updateTask } = useGTMStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  // Season filter dropdown - 외부 클릭 시 닫기
  const seasonFilterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (seasonFilterRef.current && !seasonFilterRef.current.contains(e.target as Node)) {
        setSeasonFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalSeason, setModalSeason] = useState<string>('');
  const [modalDept, setModalDept] = useState<Department>('기획');
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  // Filter state - 최신 시즌이 좌측으로
  const sortedSeasons = useMemo(() => [...seasons].sort((a, b) => b.order - a.order), [seasons]);
  const seasonIds = useMemo(() => sortedSeasons.map((s) => s.id), [sortedSeasons]);

  // 다중 시즌 선택 (최대 3개, 기본값: 최신 2개)
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(() => seasonIds.slice(0, 2));
  const [seasonFilterOpen, setSeasonFilterOpen] = useState(false);
  const [filterDept, setFilterDept] = useState<'all' | Department>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Task['status']>('all');

  // 부서별 검색어 필터
  const [deptSearchTerms, setDeptSearchTerms] = useState<Partial<Record<Department, string>>>({});
  const [deptSearchOpen, setDeptSearchOpen] = useState<Department | null>(null);
  const deptSearchInputRef = useRef<HTMLInputElement>(null);

  const setDeptSearch = useCallback((dept: Department, term: string) => {
    setDeptSearchTerms((prev) => {
      if (!term) {
        const next = { ...prev };
        delete next[dept];
        return next;
      }
      return { ...prev, [dept]: term };
    });
  }, []);

  const toggleDeptSearch = useCallback((dept: Department) => {
    setDeptSearchOpen((prev) => {
      if (prev === dept) {
        // 닫을 때 검색어 초기화
        setDeptSearchTerms((t) => {
          const next = { ...t };
          delete next[dept];
          return next;
        });
        return null;
      }
      return dept;
    });
  }, []);

  useEffect(() => {
    if (deptSearchOpen && deptSearchInputRef.current) {
      deptSearchInputRef.current.focus();
    }
  }, [deptSearchOpen]);

  // seasonIds가 변경되면 (시즌 추가/삭제) 선택 상태 동기화
  useEffect(() => {
    setSelectedSeasons((prev) => {
      const valid = prev.filter((id) => seasonIds.includes(id));
      return valid.length > 0 ? valid : seasonIds.slice(0, 2);
    });
  }, [seasonIds]);

  const toggleSeasonSelection = useCallback((seasonId: string) => {
    setSelectedSeasons((prev) => {
      if (prev.includes(seasonId)) {
        // 최소 1개는 유지
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== seasonId);
      }
      // 최대 3개 제한
      if (prev.length >= 3) return prev;
      return [...prev, seasonId];
    });
  }, []);

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; season: string; dept: Department } | null>(null);

  // 비교 모드 판별용: selectedSeasons가 모두 같은 타입인지 + 기준 시즌 계산
  const comparisonRef = useMemo(() => {
    const validSeasons = selectedSeasons
      .map((id) => seasons.find((s) => s.id === id))
      .filter(Boolean) as typeof seasons;
    if (validSeasons.length < 2) return null;
    if (!validSeasons.every((s) => s.type === validSeasons[0].type)) return null;
    return validSeasons[0]; // 기준 시즌
  }, [selectedSeasons, seasons]);

  // Date range: auto-calculate from seasons
  const allDates = useMemo(() => {
    if (seasons.length === 0) return generateDateRange('2025-05-01', '2026-12-31');

    // 비교 모드: 기준 시즌의 날짜 범위만 사용
    if (comparisonRef) {
      const start = new Date(comparisonRef.startDate);
      start.setDate(1);
      const end = new Date(comparisonRef.endDate);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      return generateDateRange(startStr, endStr);
    }

    const allStarts = seasons.map((s) => s.startDate).sort();
    const allEnds = seasons.map((s) => s.endDate).sort();
    const start = new Date(allStarts[0]);
    start.setDate(1);
    const end = new Date(allEnds[allEnds.length - 1]);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    return generateDateRange(startStr, endStr);
  }, [seasons, comparisonRef]);

  // Build task lookup map
  const taskMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const key = `${task.date}_${task.season}_${task.department}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks]);

  // Scroll to today on mount
  useEffect(() => {
    const todayIndex = allDates.findIndex((d) => isToday(d));
    if (todayIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (todayIndex - 5) * ROW_HEIGHT);
    }
  }, [allDates]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setContainerHeight(el.clientHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
  const endIndex = Math.min(
    allDates.length,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + VISIBLE_BUFFER
  );
  const visibleDates = allDates.slice(startIndex, endIndex);
  const totalHeight = allDates.length * ROW_HEIGHT;

  // 화면 상단에 보이는 첫 번째 날짜의 년도를 상위 컴포넌트에 전달
  const topVisibleIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
  const topVisibleYear = allDates[topVisibleIndex]?.slice(0, 4) ?? '';
  useEffect(() => {
    onVisibleYearChange?.(topVisibleYear);
  }, [topVisibleYear, onVisibleYearChange]);

  const openModal = (date: string, season: string, dept: Department, task?: Task) => {
    if (!currentUser) return;
    setModalDate(date);
    setModalSeason(season);
    setModalDept(dept);
    setEditingTask(task);
    setModalOpen(true);
  };

  // --- Drag and Drop handlers ---
  const handleDragStart = (e: React.DragEvent, task: Task, date: string, season: string, dept: Department) => {
    if (!currentUser) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setDragState({ task, originDate: date, originSeason: season, originDept: dept });
  };

  const handleDragOver = (e: React.DragEvent, date: string, season: string, dept: Department) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ date, season, dept });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, date: string, season: string, dept: Department) => {
    e.preventDefault();
    if (!dragState || !currentUser) return;

    const { task, originDate, originSeason, originDept } = dragState;
    if (date !== originDate || season !== originSeason || dept !== originDept) {
      updateTask(task.id, {
        date,
        season,
        department: dept,
      });
    }

    setDragState(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropTarget(null);
  };

  const renderCell = (date: string, season: string, dept: Department) => {
    const key = `${date}_${season}_${dept}`;
    const cellTasks = taskMap.get(key) || [];

    const filteredTasks = cellTasks.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      const searchTerm = deptSearchTerms[dept];
      if (searchTerm && !t.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const milestone = milestones.find(
      (m) => m.season === season && date >= m.startDate && date <= m.endDate
    );

    const isDropHere = dropTarget?.date === date && dropTarget?.season === season && dropTarget?.dept === dept;
    const isDragging = !!dragState;

    return (
      <div
        key={key}
        className={`border-b border-r border-gray-100 px-1 flex items-center cursor-pointer hover:bg-blue-50/50 transition-colors group relative ${
          isDropHere ? 'ring-2 ring-blue-400 ring-inset bg-blue-50' : ''
        }`}
        style={{
          height: ROW_HEIGHT,
          backgroundColor: isDropHere ? '#DBEAFE' : milestone ? `${milestone.color}06` : undefined,
        }}
        onClick={() => {
          if (isDragging) return;
          if (filteredTasks.length >= 1) {
            openModal(date, season, dept, filteredTasks[0]);
          } else {
            openModal(date, season, dept);
          }
        }}
        onDragOver={(e) => handleDragOver(e, date, season, dept)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, date, season, dept)}
      >
        {filteredTasks.map((task, i) => (
          <div
            key={task.id}
            draggable={!!currentUser}
            onDragStart={(e) => {
              e.stopPropagation();
              handleDragStart(e, task, date, season, dept);
            }}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-1 text-[11px] leading-tight truncate ${
              currentUser ? 'cursor-grab active:cursor-grabbing' : ''
            } ${dragState?.task.id === task.id ? 'opacity-40' : ''}`}
            title={`${task.content}${currentUser ? ' (드래그하여 이동)' : ''}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLORS[task.status] }}
            />
            <span className="truncate text-gray-700">
              {filteredTasks.length > 1 && i === 0
                ? `${task.content} (+${filteredTasks.length - 1})`
                : task.content}
            </span>
          </div>
        ))}
        {filteredTasks.length === 0 && currentUser && !isDragging && (
          <span className="text-gray-300 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
            + 추가
          </span>
        )}
        {filteredTasks.length === 0 && isDropHere && (
          <span className="text-blue-400 text-[10px]">여기에 놓기</span>
        )}
      </div>
    );
  };

  // 선택된 시즌만 표시 (selectedSeasons 배열 순서 = 표시 순서, 드래그로 변경 가능)
  const visibleSeasons: string[] = selectedSeasons.filter((id) =>
    seasons.some((s) => s.id === id)
  );

  // 비교 모드: 선택된 시즌이 2개 이상이고 모두 같은 타입(SS/FW)이면 활성화
  const comparisonMode = useMemo(() => {
    if (visibleSeasons.length < 2) return null;
    const seasonObjs = visibleSeasons.map((id) => seasons.find((s) => s.id === id)).filter(Boolean) as typeof seasons;
    if (seasonObjs.length < 2) return null;
    const allSameType = seasonObjs.every((s) => s.type === seasonObjs[0].type);
    if (!allSameType) return null;

    const refSeason = seasonObjs[0];
    const yearOffsets: Record<string, number> = {};
    for (const s of seasonObjs) {
      yearOffsets[s.id] = s.year - refSeason.year;
    }
    return { refSeason, yearOffsets };
  }, [visibleSeasons, seasons]);

  // 날짜를 년도 오프셋만큼 이동
  const offsetDate = useCallback((date: string, yearOffset: number): string => {
    if (yearOffset === 0) return date;
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + yearOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // 비교 모드에서 특정 시즌의 실제 날짜 반환
  const getActualDate = useCallback((displayDate: string, seasonId: string): string => {
    if (!comparisonMode) return displayDate;
    const yearOff = comparisonMode.yearOffsets[seasonId] ?? 0;
    return offsetDate(displayDate, yearOff);
  }, [comparisonMode, offsetDate]);

  // 시즌 헤더 드래그 앤 드롭 순서 변경
  const [headerDragIdx, setHeaderDragIdx] = useState<number | null>(null);
  const [headerDropIdx, setHeaderDropIdx] = useState<number | null>(null);

  const handleHeaderDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    setHeaderDragIdx(idx);
  };

  const handleHeaderDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHeaderDropIdx(idx);
  };

  const handleHeaderDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (headerDragIdx === null || headerDragIdx === dropIdx) {
      setHeaderDragIdx(null);
      setHeaderDropIdx(null);
      return;
    }
    setSelectedSeasons((prev) => {
      const next = [...prev];
      const [moved] = next.splice(headerDragIdx, 1);
      next.splice(dropIdx, 0, moved);
      return next;
    });
    setHeaderDragIdx(null);
    setHeaderDropIdx(null);
  };

  const handleHeaderDragEnd = () => {
    setHeaderDragIdx(null);
    setHeaderDropIdx(null);
  };
  const visibleDepts: Department[] =
    filterDept === 'all' ? DEPARTMENTS : [filterDept];

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div ref={seasonFilterRef} className="relative flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">시즌</span>
          <button
            onClick={() => setSeasonFilterOpen((v) => !v)}
            className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 flex items-center gap-1 hover:border-gray-400 transition-colors min-w-[80px]"
          >
            <span className="truncate">
              {selectedSeasons.length === sortedSeasons.length
                ? '전체'
                : selectedSeasons.join(', ')}
            </span>
            <svg className={`w-3 h-3 shrink-0 transition-transform ${seasonFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {seasonFilterOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
              <div className="px-3 py-1.5 text-[10px] text-gray-400 border-b border-gray-100">
                최대 3개 선택 가능 ({selectedSeasons.length}/3)
              </div>
              {sortedSeasons.map((s) => {
                const checked = selectedSeasons.includes(s.id);
                const disabled = !checked && selectedSeasons.length >= 3;
                const style = getSeasonStyle(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || (checked && selectedSeasons.length <= 1)}
                      onChange={() => toggleSeasonSelection(s.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900"
                    />
                    <span
                      className={`text-xs font-medium ${style.text}`}
                    >
                      {s.id}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {s.startDate.slice(2, 7)}~{s.endDate.slice(5, 7)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">부서</span>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value as typeof filterDept)}
            className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
          >
            <option value="all">전체</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">상태</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
          >
            <option value="all">전체</option>
            <option value="pending">예정</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
            <option value="delayed">지연</option>
          </select>
        </div>
        <button
          onClick={() => {
            const todayIndex = allDates.findIndex((d) => isToday(d));
            if (todayIndex >= 0 && scrollRef.current) {
              scrollRef.current.scrollTop = Math.max(0, (todayIndex - 5) * ROW_HEIGHT);
            }
          }}
          className="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700"
        >
          오늘
        </button>

        {dragState && (
          <div className="ml-auto text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
            &quot;{dragState.task.content}&quot; 이동 중... 원하는 셀에 놓으세요
          </div>
        )}
      </div>

      {/* Comparison mode indicator */}
      {comparisonMode && (
        <div className="flex items-center gap-2 px-4 py-1 bg-indigo-50 border-b border-indigo-200 shrink-0">
          <span className="text-[10px] text-indigo-600 font-medium">
            비교 모드 — 동일 타입 시즌({comparisonMode.refSeason.type})을 MM-DD 기준으로 정렬하여 비교합니다
          </span>
        </div>
      )}

      {/* Header row */}
      <div className="flex border-b-2 border-gray-300 bg-gray-50 shrink-0">
        <div className="w-[100px] shrink-0 flex items-center justify-center text-xs font-bold text-gray-700 border-r border-gray-300 py-2">
          {comparisonMode ? 'MM-DD' : '날짜'}
        </div>

        {visibleSeasons.map((seasonId, idx) => {
          const style = getSeasonStyle(seasonId);
          const isLast = idx === visibleSeasons.length - 1;
          const isDragOver = headerDropIdx === idx && headerDragIdx !== idx;
          return (
            <div
              key={seasonId}
              className={`flex-1 min-w-0 ${!isLast ? 'border-r-2' : ''} flex flex-col`}
              style={{ borderColor: style.color }}
            >
              <div
                draggable={visibleSeasons.length > 1}
                onDragStart={(e) => handleHeaderDragStart(e, idx)}
                onDragOver={(e) => handleHeaderDragOver(e, idx)}
                onDrop={(e) => handleHeaderDrop(e, idx)}
                onDragEnd={handleHeaderDragEnd}
                className={`text-center text-xs font-bold py-1.5 border-b ${style.bg} ${style.text} ${style.border} ${
                  visibleSeasons.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                } ${headerDragIdx === idx ? 'opacity-40' : ''} ${
                  isDragOver ? 'ring-2 ring-inset ring-gray-400' : ''
                } transition-all select-none`}
                title={visibleSeasons.length > 1 ? '드래그하여 순서 변경' : ''}
              >
                {visibleSeasons.length > 1 && (
                  <span className="inline-block w-3 text-[10px] opacity-40 mr-0.5">⠿</span>
                )}
                {seasonId}
                {comparisonMode && (
                  <span className="ml-1 text-[10px] opacity-60 font-normal">
                    ({seasons.find((s) => s.id === seasonId)?.startDate.slice(0, 4)}~{seasons.find((s) => s.id === seasonId)?.endDate.slice(0, 4)})
                  </span>
                )}
              </div>
              <div className="flex">
                {comparisonMode && (
                  <div className="w-[52px] shrink-0 text-center text-[10px] text-gray-400 py-1 border-r border-gray-200">
                    날짜
                  </div>
                )}
                <div className="w-[120px] shrink-0 text-center text-[10px] text-gray-500 py-1 border-r border-gray-200">
                  Milestone
                </div>
                {visibleDepts.map((d) => {
                  const hasSearch = !!deptSearchTerms[d];
                  const isSearchOpen = deptSearchOpen === d;
                  return (
                    <div key={d} className="flex-1 min-w-0 border-r border-gray-200 relative">
                      <button
                        onClick={() => toggleDeptSearch(d)}
                        className={`w-full text-center text-[11px] font-semibold py-1 transition-colors hover:bg-gray-100 ${hasSearch ? 'underline underline-offset-2' : ''}`}
                        style={{ color: DEPARTMENT_COLORS[d] }}
                        title={`${d} 검색 필터 ${isSearchOpen ? '닫기' : '열기'}`}
                      >
                        {d}
                        {hasSearch && <span className="ml-0.5 text-[9px] opacity-60">*</span>}
                      </button>
                      {isSearchOpen && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 shadow-lg rounded-b-md p-1.5">
                          <input
                            ref={deptSearchInputRef}
                            type="text"
                            value={deptSearchTerms[d] ?? ''}
                            onChange={(e) => setDeptSearch(d, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') toggleDeptSearch(d); }}
                            placeholder={`${d} 검색...`}
                            className="w-full text-[11px] border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: startIndex * ROW_HEIGHT,
              left: 0,
              right: 0,
            }}
          >
            {visibleDates.map((date) => {
              const dayKR = getDayOfWeekKR(date);
              const weekend = isWeekend(date);
              const today = isToday(date);
              const holiday = isHoliday(date);
              const d = new Date(date);
              const isFirstOfMonth = d.getDate() === 1;

              return (
                <div
                  key={date}
                  className={`flex ${
                    today
                      ? 'bg-yellow-50'
                      : holiday
                      ? 'bg-red-50/50'
                      : weekend
                      ? 'bg-gray-50/80'
                      : ''
                  } ${isFirstOfMonth ? 'border-t-2 border-t-gray-400' : ''}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Date cell */}
                  <div
                    className={`w-[100px] shrink-0 flex items-center gap-1 px-2 text-[11px] border-r border-gray-300 border-b border-b-gray-100 ${
                      today ? 'font-bold' : ''
                    } ${
                      holiday
                        ? 'text-red-500'
                        : weekend
                        ? 'text-gray-400'
                        : 'text-gray-600'
                    }`}
                  >
                    <span className="w-[52px]">{date.slice(5)}</span>
                    <span className={`w-[14px] text-center ${
                      dayKR === '일' || holiday ? 'text-red-400' : dayKR === '토' ? 'text-blue-400' : ''
                    }`}>
                      {dayKR}
                    </span>
                    {holiday && (
                      <span className="text-[9px] text-red-400 truncate" title={holiday}>
                        {holiday}
                      </span>
                    )}
                  </div>

                  {/* Dynamic season columns */}
                  {visibleSeasons.map((seasonId, idx) => {
                    const style = getSeasonStyle(seasonId);
                    const isLast = idx === visibleSeasons.length - 1;
                    const actualDate = getActualDate(date, seasonId);
                    return (
                      <div
                        key={seasonId}
                        className={`flex flex-1 min-w-0 ${!isLast ? 'border-r-2' : ''}`}
                        style={{ borderColor: style.color + '40' }}
                      >
                        {/* 비교 모드: 각 시즌 컬럼 앞에 해당 시즌의 실제 년도 날짜 표시 */}
                        {comparisonMode && (
                          <div
                            className="w-[52px] shrink-0 flex items-center justify-center text-[10px] text-gray-400 border-r border-gray-100 border-b border-b-gray-100"
                            style={{ height: ROW_HEIGHT }}
                          >
                            <span style={{ color: style.color }} className="font-medium opacity-70">
                              {actualDate.slice(2, 10)}
                            </span>
                          </div>
                        )}
                        <div className="w-[120px] shrink-0 border-r border-gray-100 border-b border-b-gray-100">
                          {(() => {
                            const ms = milestones.find(
                              (m) => m.season === seasonId && actualDate >= m.startDate && actualDate <= m.endDate
                            );
                            if (!ms) return <div style={{ height: ROW_HEIGHT }} />;
                            const isStart = actualDate === ms.startDate;
                            return (
                              <div
                                className="h-full flex items-center px-1"
                                style={{ height: ROW_HEIGHT, backgroundColor: `${ms.color}15` }}
                              >
                                {isStart && (
                                  <span className="text-[9px] font-semibold truncate" style={{ color: ms.color }} title={ms.name}>
                                    {ms.name}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        {visibleDepts.map((dept) => (
                          <div key={dept} className="flex-1 min-w-0">
                            {renderCell(actualDate, seasonId, dept)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(undefined);
        }}
        date={modalDate}
        season={modalSeason}
        department={modalDept}
        existingTask={editingTask}
      />
    </div>
  );
}
