'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { Department, DEPARTMENTS, DEPARTMENT_COLORS, STATUS_COLORS, Task, ViewMode, DateGroup, getSeasonStyle } from '@/lib/types';
import {
  generateDateRange,
  getDayOfWeekKR,
  isWeekend,
  isToday,
  isHoliday,
  groupDatesByWeek,
  groupDatesByMonth,
} from '@/lib/dateUtils';
import TaskModal from './TaskModal';
import PeriodScheduleModal from './PeriodScheduleModal';

const ROW_HEIGHT = 32;
const GROUP_ROW_HEIGHT_WEEKLY = 64;   // 주차: 기본의 2배
const GROUP_ROW_HEIGHT_MONTHLY = 128; // 월별: 기본의 4배
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
  const { tasks, milestones, seasons, currentUser, updateTask, addTask, deleteTask, rescheduleTask } = useGTMStore();
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

  // 셀 선택 상태 (클릭으로 선택, 단축키로 복사/잘라내기/붙여넣기)
  const [selectedCell, setSelectedCell] = useState<{ date: string; season: string; dept: Department } | null>(null);
  const [clipboard, setClipboard] = useState<{ task: Task; mode: 'copy' | 'cut' } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalSeason, setModalSeason] = useState<string>('');
  const [modalDept, setModalDept] = useState<Department>('기획');
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  // Period schedule modal state
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [periodModalSeason, setPeriodModalSeason] = useState<string>('');
  const [periodModalDept, setPeriodModalDept] = useState<Department>('기획');
  const [editingPeriodTask, setEditingPeriodTask] = useState<Task | undefined>();

  // Filter state - 최신 시즌이 좌측으로
  const sortedSeasons = useMemo(() => [...seasons].sort((a, b) => b.order - a.order), [seasons]);
  const seasonIds = useMemo(() => sortedSeasons.map((s) => s.id), [sortedSeasons]);

  // 다중 시즌 선택 (최대 3개, 기본값: 최신 2개)
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(() => seasonIds.slice(0, 2));
  const [seasonFilterOpen, setSeasonFilterOpen] = useState(false);
  const [filterDept, setFilterDept] = useState<'all' | Department>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Task['status']>('all');

  // 뷰 모드: 일자 / 주차 / 월별
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 뷰 모드 변경 시 펼침 상태 초기화
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [viewMode]);

  // 시즌+부서별 검색어 필터 (키: "seasonId_dept")
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [searchOpen, setSearchOpen] = useState<string | null>(null); // "seasonId_dept" or null
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchKey = (seasonId: string, dept: Department) => `${seasonId}_${dept}`;

  const setSearch = useCallback((key: string, term: string) => {
    setSearchTerms((prev) => {
      if (!term) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: term };
    });
  }, []);

  const toggleSearch = useCallback((key: string) => {
    setSearchOpen((prev) => {
      if (prev === key) {
        setSearchTerms((t) => {
          const next = { ...t };
          delete next[key];
          return next;
        });
        return null;
      }
      return key;
    });
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // 키보드 단축키용 ref (최신 값 참조를 위해)
  const selectedCellRef = useRef(selectedCell);
  const clipboardRef = useRef(clipboard);
  const tasksRef = useRef(tasks);
  selectedCellRef.current = selectedCell;
  clipboardRef.current = clipboard;
  tasksRef.current = tasks;

  // 키보드 단축키: Ctrl+C 복사, Ctrl+X 잘라내기, Ctrl+V 붙여넣기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentUser || searchOpen || modalOpen || periodModalOpen) return;
      if (!e.ctrlKey && !e.metaKey) return;
      const cell = selectedCellRef.current;
      if (!cell) return;

      if (e.key === 'c') {
        e.preventDefault();
        const found = tasksRef.current.find(
          (t) => t.date === cell.date && t.season === cell.season && t.department === cell.dept && !t.endDate
        );
        if (found) setClipboard({ task: { ...found }, mode: 'copy' });
      } else if (e.key === 'x') {
        e.preventDefault();
        const found = tasksRef.current.find(
          (t) => t.date === cell.date && t.season === cell.season && t.department === cell.dept && !t.endDate
        );
        if (found) setClipboard({ task: { ...found }, mode: 'cut' });
      } else if (e.key === 'v') {
        const cb = clipboardRef.current;
        if (!cb) return;
        e.preventDefault();
        addTask({
          date: cell.date,
          season: cell.season,
          department: cell.dept,
          content: cb.task.content,
          status: cb.task.status,
          milestone: cb.task.milestone,
        });
        if (cb.mode === 'cut') {
          deleteTask(cb.task.id);
          setClipboard(null);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, searchOpen, modalOpen, periodModalOpen, addTask, deleteTask]);

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
    // 시즌 종료일이 속한 년도의 12월 31일까지 표시
    const lastEnd = new Date(allEnds[allEnds.length - 1]);
    const endYear = lastEnd.getFullYear();
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
    const endStr = `${endYear}-12-31`;
    return generateDateRange(startStr, endStr);
  }, [seasons, comparisonRef]);

  // Build task lookup map (기간 태스크는 date~endDate 범위의 모든 날짜에 삽입)
  const taskMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.endDate && task.endDate > task.date) {
        // 기간 태스크: 모든 날짜에 삽입
        const dates = generateDateRange(task.date, task.endDate);
        for (const d of dates) {
          const key = `${d}_${task.season}_${task.department}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(task);
        }
      } else {
        // 단일 날짜 태스크
        const key = `${task.date}_${task.season}_${task.department}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      }
    }
    return map;
  }, [tasks]);

  // 검색어 활성 여부
  const hasAnySearch = Object.keys(searchTerms).length > 0;

  const groupRowHeight = viewMode === 'monthly' ? GROUP_ROW_HEIGHT_MONTHLY : GROUP_ROW_HEIGHT_WEEKLY;

  // 뷰 모드용 날짜 그룹 (allDates 기반, 스크롤 위치 계산에 사용)
  const allDateGroups = useMemo(() => {
    if (viewMode === 'daily') return null;
    return viewMode === 'weekly' ? groupDatesByWeek(allDates) : groupDatesByMonth(allDates);
  }, [viewMode, allDates]);

  // Scroll to today on mount and when viewMode changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    if (viewMode === 'daily') {
      const todayIndex = allDates.findIndex((d) => isToday(d));
      if (todayIndex >= 0) {
        scrollRef.current.scrollTop = Math.max(0, (todayIndex - 5) * ROW_HEIGHT);
      }
    } else {
      // 그룹 모드: 오늘이 포함된 그룹을 찾아서 스크롤
      if (allDateGroups) {
        const groupIdx = allDateGroups.findIndex((g) => g.dates.some((d) => d === todayStr));
        if (groupIdx >= 0) {
          const offset = groupIdx * groupRowHeight;
          scrollRef.current.scrollTop = Math.max(0, offset - groupRowHeight);
        }
      }
    }
  }, [allDates, viewMode, allDateGroups, groupRowHeight]);

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

  const openModal = (date: string, season: string, dept: Department, task?: Task) => {
    if (!currentUser) return;
    setModalDate(date);
    setModalSeason(season);
    setModalDept(dept);
    setEditingTask(task);
    setModalOpen(true);
  };

  const openPeriodModal = (season: string, dept: Department, task?: Task) => {
    if (!currentUser) return;
    setPeriodModalSeason(season);
    setPeriodModalDept(dept);
    setEditingPeriodTask(task);
    setPeriodModalOpen(true);
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
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    setDropTarget({ date, season, dept });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, date: string, season: string, dept: Department) => {
    e.preventDefault();
    if (!dragState || !currentUser) return;

    const { task, originDate, originSeason, originDept } = dragState;
    const isSameCell = date === originDate && season === originSeason && dept === originDept;

    if (e.ctrlKey) {
      // Ctrl+드롭: 복사
      addTask({
        date,
        season,
        department: dept,
        content: task.content,
        status: task.status,
        milestone: task.milestone,
      });
    } else if (!isSameCell) {
      const dateChanged = date !== originDate;
      if (dateChanged && task.status !== 'rescheduled') {
        // 날짜 변경 시 reschedule (연결 표시)
        rescheduleTask(task.id, date, season, dept);
      } else {
        // 같은 날짜 내 이동 (부서/시즌만 변경)
        updateTask(task.id, {
          date,
          season,
          department: dept,
        });
      }
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

    // 기간 태스크와 일반 태스크 분리
    const periodTasks = cellTasks.filter((t) => t.endDate && t.barColor);
    const regularTasks = cellTasks.filter((t) => !t.endDate);

    const filteredRegular = regularTasks.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      const term = searchTerms[searchKey(season, dept)];
      if (term && !t.content.toLowerCase().includes(term.toLowerCase())) return false;
      return true;
    });

    // 검색 시 기간 태스크도 필터링
    const filteredPeriod = periodTasks.filter((t) => {
      const term = searchTerms[searchKey(season, dept)];
      if (term && !t.content.toLowerCase().includes(term.toLowerCase())) return false;
      return true;
    });

    // 기간 태스크 중복 제거 (같은 id가 여러 날짜에 나타남)
    const uniquePeriod = filteredPeriod.filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

    const milestone = milestones.find(
      (m) => m.season === season && date >= m.startDate && date <= m.endDate
    );

    const isDropHere = dropTarget?.date === date && dropTarget?.season === season && dropTarget?.dept === dept;
    const isDragging = !!dragState;
    const isSelected = selectedCell?.date === date && selectedCell?.season === season && selectedCell?.dept === dept;
    const isCutSource = clipboard?.mode === 'cut' && clipboard.task && cellTasks.some((t) => t.id === clipboard.task.id);

    const hasPeriod = uniquePeriod.length > 0;

    return (
      <div
        key={key}
        data-testid={`cell-${date}-${season}-${dept}`}
        className={`border-b border-r border-gray-100 cursor-pointer hover:bg-blue-50/50 transition-colors group relative ${
          isDropHere ? 'ring-2 ring-blue-400 ring-inset bg-blue-50' : ''
        } ${isSelected ? 'ring-2 ring-gray-900 ring-inset' : ''}`}
        style={{
          height: ROW_HEIGHT,
          backgroundColor: isDropHere ? '#DBEAFE' : (!hasPeriod && milestone) ? `${milestone.color}06` : undefined,
        }}
        onClick={(e) => {
          if (isDragging) return;
          e.stopPropagation();
          setSelectedCell({ date, season, dept });
        }}
        onDoubleClick={() => {
          if (isDragging) return;
          if (filteredRegular.length >= 1) {
            openModal(date, season, dept, filteredRegular[0]);
          } else if (uniquePeriod.length > 0 && filteredRegular.length === 0) {
            openPeriodModal(season, dept, uniquePeriod[0]);
          } else {
            openModal(date, season, dept);
          }
        }}
        onDragOver={(e) => handleDragOver(e, date, season, dept)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, date, season, dept)}
      >
        {/* 기간 태스크 배경 스트라이프 */}
        {hasPeriod && (
          <div className="absolute inset-0 flex flex-col">
            {uniquePeriod.map((pt) => (
              <div
                key={pt.id}
                className="cursor-pointer"
                style={{
                  flex: 1,
                  backgroundColor: pt.barColor,
                  opacity: 0.3,
                }}
                title={`${pt.content} (${pt.date} ~ ${pt.endDate})`}
                onClick={(e) => {
                  e.stopPropagation();
                  openPeriodModal(season, dept, pt);
                }}
              />
            ))}
          </div>
        )}
        {/* 일반 태스크 콘텐츠 */}
        <div className="relative z-10 flex items-center px-1 h-full">
          {filteredRegular.map((task, i) => {
            const isRescheduled = task.status === 'rescheduled';
            const linkedTo = isRescheduled ? tasks.find((t) => t.id === task.linkedTo) : null;
            const linkedFrom = task.linkedFrom ? tasks.find((t) => t.id === task.linkedFrom) : null;

            return (
              <div
                key={task.id}
                draggable={!!currentUser && !isRescheduled}
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleDragStart(e, task, date, season, dept);
                }}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1 text-[11px] leading-tight truncate ${
                  currentUser && !isRescheduled ? 'cursor-grab active:cursor-grabbing' : ''
                } ${dragState?.task.id === task.id || (isCutSource && clipboard?.task.id === task.id) ? 'opacity-40' : ''} ${
                  isRescheduled ? 'opacity-40' : ''
                }`}
                title={
                  isRescheduled
                    ? `${task.content} → ${linkedTo?.date ?? ''}로 변경됨`
                    : linkedFrom
                    ? `${task.content} (← ${linkedFrom.date}에서 변경)`
                    : `${task.content}${currentUser ? ' (더블클릭: 수정 / 드래그: 이동 / Ctrl+드래그: 복사)' : ''}`
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[task.status] }}
                />
                {linkedFrom && (
                  <span className="text-[9px] text-blue-400 shrink-0">←{linkedFrom.date.slice(5)}</span>
                )}
                <span className={`truncate ${isRescheduled ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {filteredRegular.length > 1 && i === 0
                    ? `${task.content} (+${filteredRegular.length - 1})`
                    : task.content}
                </span>
                {isRescheduled && linkedTo && (
                  <span className="text-[9px] text-gray-400 shrink-0">→{linkedTo.date.slice(5)}</span>
                )}
              </div>
            );
          })}
          {filteredRegular.length === 0 && !hasPeriod && currentUser && !isDragging && (
            <span className="text-gray-300 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
              더블클릭
            </span>
          )}
          {filteredRegular.length === 0 && isDropHere && (
            <span className="text-blue-400 text-[10px]">여기에 놓기</span>
          )}
        </div>
      </div>
    );
  };

  // --- 요약 셀 (주차/월별 모드용) ---
  const renderSummaryCell = (dates: string[], seasonId: string, dept: Department) => {
    // 해당 기간+시즌+부서의 모든 태스크 수집
    const allTasks: Task[] = [];
    const seen = new Set<string>();
    for (const date of dates) {
      const actualDate = getActualDate(date, seasonId);
      const key = `${actualDate}_${seasonId}_${dept}`;
      const cellTasks = taskMap.get(key) || [];
      for (const t of cellTasks) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          if (filterStatus !== 'all' && t.status !== filterStatus) continue;
          allTasks.push(t);
        }
      }
    }

    const height = groupRowHeight;

    if (allTasks.length === 0) {
      return (
        <div className="flex-1 min-w-0 border-b border-r border-gray-100 flex items-center justify-center" style={{ height }}>
          <span className="text-[10px] text-gray-300">-</span>
        </div>
      );
    }

    const regularTasks = allTasks.filter((t) => !t.endDate);
    const periodTasks = allTasks.filter((t) => t.endDate);

    // 표시할 업무 내용 수: 주차=3개, 월별=8개
    const maxItems = viewMode === 'monthly' ? 8 : 3;
    const displayTasks = [...regularTasks, ...periodTasks].slice(0, maxItems);
    const remaining = regularTasks.length + periodTasks.length - displayTasks.length;

    return (
      <div
        className="flex-1 min-w-0 border-b border-r border-gray-100 px-1.5 py-1 cursor-default hover:bg-gray-50/50 transition-colors overflow-hidden"
        style={{ height }}
      >
        <div className="flex flex-col gap-0.5 h-full">
          {displayTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-1 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: task.endDate ? (task.barColor || '#8B5CF6') : STATUS_COLORS[task.status] }}
              />
              <span className="text-[10px] text-gray-700 truncate leading-tight">
                {task.content}
              </span>
            </div>
          ))}
          {remaining > 0 && (
            <span className="text-[9px] text-gray-400 pl-2.5">+{remaining}개 더</span>
          )}
        </div>
      </div>
    );
  };

  // 선택�� 시즌만 표시 (selectedSeasons 배열 순서 = 표시 순서, 드래��로 변경 가능)
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

  // 엑셀 필터 방식: 검색어가 있으면 매칭되는 날짜 행만 남김
  const displayDates = useMemo(() => {
    if (!hasAnySearch) return allDates;
    const entries = Object.entries(searchTerms); // ["seasonId_dept", "term"]
    return allDates.filter((date) => {
      for (const [compositeKey, term] of entries) {
        const [seasonId, dept] = compositeKey.split('_') as [string, Department];
        const actualDate = getActualDate(date, seasonId);
        const taskKey = `${actualDate}_${seasonId}_${dept}`;
        const cellTasks = taskMap.get(taskKey);
        if (cellTasks?.some((t) => t.content.toLowerCase().includes(term.toLowerCase()))) {
          return true;
        }
      }
      return false;
    });
  }, [allDates, hasAnySearch, searchTerms, getActualDate, taskMap]);

  // 가상 스크롤 계산 (검색 시 displayDates 사용)
  const scrollDates = hasAnySearch ? displayDates : allDates;

  // --- 그룹 모드 행 계산 ---
  type FlatRow = { type: 'date'; date: string } | { type: 'group'; group: DateGroup };

  const dateGroups = useMemo(() => {
    if (viewMode === 'daily') return null;
    return viewMode === 'weekly' ? groupDatesByWeek(scrollDates) : groupDatesByMonth(scrollDates);
  }, [viewMode, scrollDates]);

  const flatRows = useMemo<FlatRow[]>(() => {
    if (viewMode === 'daily' || !dateGroups) {
      return scrollDates.map((d) => ({ type: 'date' as const, date: d }));
    }
    const rows: FlatRow[] = [];
    for (const group of dateGroups) {
      rows.push({ type: 'group', group });
      if (expandedGroups.has(group.key)) {
        for (const date of group.dates) {
          rows.push({ type: 'date', date });
        }
      }
    }
    return rows;
  }, [viewMode, dateGroups, scrollDates, expandedGroups]);

  // 각 행의 높이와 누적 오프셋 계산
  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let cumulative = 0;
    for (const row of flatRows) {
      offsets.push(cumulative);
      cumulative += row.type === 'group' ? groupRowHeight : ROW_HEIGHT;
    }
    return { offsets, totalHeight: cumulative };
  }, [flatRows, groupRowHeight]);

  // 가상 스크롤: 가시 범위의 행 인덱스 계산
  const { visibleStartIdx, visibleEndIdx } = useMemo(() => {
    const { offsets, totalHeight } = rowOffsets;
    const viewTop = scrollTop;
    const viewBottom = scrollTop + containerHeight;

    // 이진 탐색으로 시작 인덱스 찾기
    let lo = 0, hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const rowBottom = offsets[mid] + (flatRows[mid].type === 'group' ? groupRowHeight : ROW_HEIGHT);
      if (rowBottom < viewTop) lo = mid + 1;
      else hi = mid;
    }
    const startIdx = Math.max(0, lo - VISIBLE_BUFFER);

    // 끝 인덱스
    let endIdx = startIdx;
    while (endIdx < offsets.length && offsets[endIdx] < viewBottom) endIdx++;
    endIdx = Math.min(offsets.length, endIdx + VISIBLE_BUFFER);

    return { visibleStartIdx: startIdx, visibleEndIdx: endIdx };
  }, [scrollTop, containerHeight, rowOffsets, flatRows, groupRowHeight]);

  const renderedRows = flatRows.slice(visibleStartIdx, visibleEndIdx);
  const scrollTotalHeight = rowOffsets.totalHeight;

  // 화면 상단에 보이는 날짜의 년도
  const topRow = flatRows[Math.max(0, visibleStartIdx)];
  const topDate = topRow?.type === 'date' ? topRow.date : topRow?.type === 'group' ? topRow.group.dates[0] : '';
  const topYear = topDate?.slice(0, 4) ?? '';
  useEffect(() => {
    onVisibleYearChange?.(topYear);
  }, [topYear, onVisibleYearChange]);

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
        {/* 뷰 모드 토글 */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded p-0.5">
          {([['daily', '일자'], ['weekly', '주차'], ['monthly', '월별']] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                viewMode === mode
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const todayIndex = scrollDates.findIndex((d) => isToday(d));
            if (todayIndex >= 0 && scrollRef.current) {
              scrollRef.current.scrollTop = Math.max(0, (todayIndex - 5) * ROW_HEIGHT);
            }
          }}
          className="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700"
        >
          오늘
        </button>

        {hasAnySearch && (
          <div className="ml-2 flex items-center gap-2">
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              검색 결과: {displayDates.length}일 / {allDates.length}일
            </span>
            <button
              onClick={() => {
                setSearchTerms({});
                setSearchOpen(null);
              }}
              className="text-[10px] text-gray-500 hover:text-red-500 px-1.5 py-0.5 rounded border border-gray-300 hover:border-red-300"
            >
              검색 초기화
            </button>
          </div>
        )}

        {clipboard && (
          <div data-testid="clipboard-indicator" className="ml-2 text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
            {clipboard.mode === 'copy' ? '복사됨' : '잘라냄'}: &quot;{clipboard.task.content}&quot;
            <button
              onClick={() => setClipboard(null)}
              className="text-purple-400 hover:text-red-500 ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {dragState && (
          <div className="ml-auto text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
            &quot;{dragState.task.content}&quot; 이동 중... 놓기=이동 / Ctrl+놓기=복사
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
          {comparisonMode ? 'MM-DD' : viewMode === 'daily' ? '날짜' : viewMode === 'weekly' ? '주차' : '월'}
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
                  const sk = searchKey(seasonId, d);
                  const hasSearch = !!searchTerms[sk];
                  const isOpen = searchOpen === sk;
                  return (
                    <div key={d} className="flex-1 min-w-0 border-r border-gray-200">
                      {isOpen ? (
                        <div className="flex items-center px-0.5 py-0.5">
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerms[sk] ?? ''}
                            onChange={(e) => setSearch(sk, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') toggleSearch(sk); }}
                            placeholder={`${d} 검색...`}
                            className="w-full text-[11px] border border-gray-300 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:border-blue-400 min-w-0"
                          />
                          <button
                            onClick={() => toggleSearch(sk)}
                            className="shrink-0 ml-0.5 text-gray-400 hover:text-red-500 text-[11px] px-0.5"
                            title="닫기"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center group/dept">
                          <button
                            onClick={() => toggleSearch(sk)}
                            className={`text-center text-[11px] font-semibold py-1 transition-colors hover:bg-gray-100 flex-1 ${hasSearch ? 'underline underline-offset-2' : ''}`}
                            style={{ color: DEPARTMENT_COLORS[d] }}
                            title={`${seasonId} ${d} 검색 필터 열기`}
                          >
                            {d}
                            {hasSearch && <span className="ml-0.5 text-[9px] opacity-60">*</span>}
                          </button>
                          {currentUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPeriodModal(seasonId, d);
                              }}
                              className="text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded px-1 py-0.5 opacity-0 group-hover/dept:opacity-100 transition-opacity shrink-0"
                              title={`${seasonId} ${d} 기간 일정 추가`}
                            >
                              +
                            </button>
                          )}
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
        <div style={{ height: scrollTotalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: rowOffsets.offsets[visibleStartIdx] ?? 0,
              left: 0,
              right: 0,
            }}
          >
            {renderedRows.map((row, ri) => {
              // --- 그룹 헤더 행 ---
              if (row.type === 'group') {
                const { group } = row;
                const isExpanded = expandedGroups.has(group.key);
                const dateRange = `${group.dates[0].slice(5)} ~ ${group.dates[group.dates.length - 1].slice(5)}`;
                return (
                  <div
                    key={`group-${group.key}`}
                    className="flex bg-gray-50 border-b-2 border-gray-200 hover:bg-gray-100 transition-colors"
                    style={{ height: groupRowHeight }}
                  >
                    {/* 그룹 라벨 (좌측 날짜 컬럼) */}
                    <div
                      className="w-[100px] shrink-0 flex items-center gap-1 px-2 border-r border-gray-300 cursor-pointer select-none"
                      onClick={() => toggleGroup(group.key)}
                    >
                      <svg
                        className={`w-3 h-3 shrink-0 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-gray-700 truncate">{group.label}</div>
                        <div className="text-[9px] text-gray-400 truncate">{dateRange}</div>
                      </div>
                    </div>

                    {/* 시즌별 요약 셀 */}
                    {visibleSeasons.map((seasonId, idx) => {
                      const style = getSeasonStyle(seasonId);
                      const isLast = idx === visibleSeasons.length - 1;
                      return (
                        <div
                          key={seasonId}
                          className={`flex flex-1 min-w-0 ${!isLast ? 'border-r-2' : ''}`}
                          style={{ borderColor: style.color + '40' }}
                        >
                          {comparisonMode && (
                            <div className="w-[52px] shrink-0 border-r border-gray-100" style={{ height: groupRowHeight }} />
                          )}
                          {/* 마일스톤 컬럼: 해당 기간에 걸친 마일스톤 이름들 */}
                          <div
                            className="w-[120px] shrink-0 border-r border-gray-100 flex items-center px-1"
                            style={{ height: groupRowHeight }}
                          >
                            {(() => {
                              const msNames = new Set<string>();
                              for (const date of group.dates) {
                                const actualDate = getActualDate(date, seasonId);
                                const ms = milestones.find(
                                  (m) => m.season === seasonId && actualDate >= m.startDate && actualDate <= m.endDate
                                );
                                if (ms) msNames.add(ms.name);
                              }
                              if (msNames.size === 0) return null;
                              return (
                                <span className="text-[9px] text-gray-500 truncate" title={[...msNames].join(', ')}>
                                  {[...msNames].join(', ')}
                                </span>
                              );
                            })()}
                          </div>
                          {/* 부서별 요약 */}
                          {visibleDepts.map((dept) => (
                            <React.Fragment key={dept}>
                              {renderSummaryCell(group.dates, seasonId, dept)}
                            </React.Fragment>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // --- 일반 날짜 행 (기존 로직) ---
              const date = row.date;
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
                  } ${isFirstOfMonth && viewMode === 'daily' ? 'border-t-2 border-t-gray-400' : ''}`}
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
      <PeriodScheduleModal
        isOpen={periodModalOpen}
        onClose={() => {
          setPeriodModalOpen(false);
          setEditingPeriodTask(undefined);
        }}
        season={periodModalSeason}
        department={periodModalDept}
        existingTask={editingPeriodTask}
      />
    </div>
  );
}
