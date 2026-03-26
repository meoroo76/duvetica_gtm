'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { Department, DEPARTMENTS, DEPARTMENT_COLORS, STATUS_COLORS, Task } from '@/lib/types';
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
  originSeason: '27SS' | '26FW';
  originDept: Department;
}

export default function CalendarGrid() {
  const { tasks, milestones, currentUser, updateTask } = useGTMStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalSeason, setModalSeason] = useState<'27SS' | '26FW'>('26FW');
  const [modalDept, setModalDept] = useState<Department>('기획');
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  // Filter state
  const [filterSeason, setFilterSeason] = useState<'all' | '27SS' | '26FW'>('all');
  const [filterDept, setFilterDept] = useState<'all' | Department>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Task['status']>('all');

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; season: '27SS' | '26FW'; dept: Department } | null>(null);

  // Date range: 2025-05 to 2026-06
  const allDates = useMemo(
    () => generateDateRange('2025-05-01', '2026-12-31'),
    []
  );

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

  const openModal = (date: string, season: '27SS' | '26FW', dept: Department, task?: Task) => {
    if (!currentUser) return;
    setModalDate(date);
    setModalSeason(season);
    setModalDept(dept);
    setEditingTask(task);
    setModalOpen(true);
  };

  // --- Drag and Drop handlers ---
  const handleDragStart = (e: React.DragEvent, task: Task, date: string, season: '27SS' | '26FW', dept: Department) => {
    if (!currentUser) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setDragState({ task, originDate: date, originSeason: season, originDept: dept });
  };

  const handleDragOver = (e: React.DragEvent, date: string, season: '27SS' | '26FW', dept: Department) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ date, season, dept });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, date: string, season: '27SS' | '26FW', dept: Department) => {
    e.preventDefault();
    if (!dragState || !currentUser) return;

    const { task, originDate, originSeason, originDept } = dragState;
    // Only update if actually moved
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

  const renderCell = (date: string, season: '27SS' | '26FW', dept: Department) => {
    const key = `${date}_${season}_${dept}`;
    const cellTasks = taskMap.get(key) || [];

    // Apply filters
    const filteredTasks = cellTasks.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
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

  const visibleSeasons: ('27SS' | '26FW')[] =
    filterSeason === 'all' ? ['27SS', '26FW'] : [filterSeason];
  const visibleDepts: Department[] =
    filterDept === 'all' ? DEPARTMENTS : [filterDept];

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">시즌</span>
          <select
            value={filterSeason}
            onChange={(e) => setFilterSeason(e.target.value as typeof filterSeason)}
            className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
          >
            <option value="all">전체</option>
            <option value="27SS">27SS</option>
            <option value="26FW">26FW</option>
          </select>
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

      {/* Header row */}
      <div className="flex border-b-2 border-gray-300 bg-gray-50 shrink-0">
        <div className="w-[100px] shrink-0 flex items-center justify-center text-xs font-bold text-gray-700 border-r border-gray-300 py-2">
          날짜
        </div>

        {visibleSeasons.includes('27SS') && (
          <div
            className="shrink-0 border-r-2 border-blue-300 flex flex-col"
            style={{ width: visibleDepts.length * 160 + 60 }}
          >
            <div className="text-center text-xs font-bold text-blue-700 bg-blue-50 py-1.5 border-b border-blue-200">
              27SS
            </div>
            <div className="flex">
              <div className="w-[60px] shrink-0 text-center text-[10px] text-gray-500 py-1 border-r border-gray-200">
                Milestone
              </div>
              {visibleDepts.map((d) => (
                <div
                  key={d}
                  className="w-[160px] shrink-0 text-center text-[11px] font-semibold py-1 border-r border-gray-200"
                  style={{ color: DEPARTMENT_COLORS[d] }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        )}

        {visibleSeasons.includes('26FW') && (
          <div
            className="shrink-0 flex flex-col"
            style={{ width: visibleDepts.length * 160 + 60 }}
          >
            <div className="text-center text-xs font-bold text-orange-700 bg-orange-50 py-1.5 border-b border-orange-200">
              26FW
            </div>
            <div className="flex">
              <div className="w-[60px] shrink-0 text-center text-[10px] text-gray-500 py-1 border-r border-gray-200">
                Milestone
              </div>
              {visibleDepts.map((d) => (
                <div
                  key={d}
                  className="w-[160px] shrink-0 text-center text-[11px] font-semibold py-1 border-r border-gray-200"
                  style={{ color: DEPARTMENT_COLORS[d] }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        )}
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

                  {/* 27SS columns */}
                  {visibleSeasons.includes('27SS') && (
                    <div className="flex shrink-0 border-r-2 border-blue-200">
                      <div className="w-[60px] shrink-0 border-r border-gray-100 border-b border-b-gray-100">
                        {(() => {
                          const ms = milestones.find(
                            (m) => m.season === '27SS' && date >= m.startDate && date <= m.endDate
                          );
                          if (!ms) return <div style={{ height: ROW_HEIGHT }} />;
                          const isStart = date === ms.startDate;
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
                        <div key={dept} className="w-[160px] shrink-0">
                          {renderCell(date, '27SS', dept)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 26FW columns */}
                  {visibleSeasons.includes('26FW') && (
                    <div className="flex shrink-0">
                      <div className="w-[60px] shrink-0 border-r border-gray-100 border-b border-b-gray-100">
                        {(() => {
                          const ms = milestones.find(
                            (m) => m.season === '26FW' && date >= m.startDate && date <= m.endDate
                          );
                          if (!ms) return <div style={{ height: ROW_HEIGHT }} />;
                          const isStart = date === ms.startDate;
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
                        <div key={dept} className="w-[160px] shrink-0">
                          {renderCell(date, '26FW', dept)}
                        </div>
                      ))}
                    </div>
                  )}
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
