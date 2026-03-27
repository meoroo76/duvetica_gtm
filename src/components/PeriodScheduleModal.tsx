'use client';

import { useState, useEffect } from 'react';
import { Task, Department, PERIOD_COLORS, getSeasonStyle } from '@/lib/types';
import { useGTMStore } from '@/store/gtmStore';

interface PeriodScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: string;
  department: Department;
  existingTask?: Task;
}

export default function PeriodScheduleModal({
  isOpen,
  onClose,
  season,
  department,
  existingTask,
}: PeriodScheduleModalProps) {
  const { addTask, updateTask, deleteTask, currentUser, seasons } = useGTMStore();
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [barColor, setBarColor] = useState(PERIOD_COLORS[0]);

  const seasonObj = seasons.find((s) => s.id === season);

  useEffect(() => {
    if (existingTask) {
      setContent(existingTask.content);
      setStartDate(existingTask.date);
      setEndDate(existingTask.endDate || '');
      setBarColor(existingTask.barColor || PERIOD_COLORS[0]);
    } else {
      setContent('');
      setStartDate(seasonObj?.startDate || '');
      setEndDate('');
      setBarColor(PERIOD_COLORS[0]);
    }
  }, [existingTask, seasonObj]);

  if (!isOpen || !currentUser) return null;

  const handleSave = () => {
    if (!content.trim() || !startDate || !endDate) return;
    if (endDate < startDate) return;

    if (existingTask) {
      updateTask(existingTask.id, {
        content,
        date: startDate,
        endDate,
        barColor,
        department,
      });
    } else {
      addTask({
        date: startDate,
        endDate,
        season,
        department,
        content,
        barColor,
        status: 'pending',
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingTask && confirm('이 기간 일정을 삭제하시겠습니까?')) {
      deleteTask(existingTask.id);
      onClose();
    }
  };

  const style = getSeasonStyle(season);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {existingTask ? '기간 일정 수정' : '기간 일정 추가'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <div className="text-sm text-gray-500 mb-4 flex gap-3">
          <span className={`px-2 py-1 rounded font-medium ${style.badgeBg} ${style.badgeText}`}>
            {season}
          </span>
          <span className="px-2 py-1 bg-gray-100 rounded font-medium">{department}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">일정명</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              placeholder="기간 일정 이름을 입력하세요"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </div>

          {endDate && startDate && endDate < startDate && (
            <p className="text-xs text-red-500">종료일은 시작일 이후여야 합니다</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
            <div className="flex flex-wrap gap-2">
              {PERIOD_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBarColor(color)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    barColor === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          {content && startDate && endDate && endDate >= startDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">미리보기</label>
              <div
                className="h-8 rounded-lg flex items-center px-3 text-xs font-medium text-white"
                style={{ backgroundColor: barColor }}
              >
                {content} ({startDate} ~ {endDate})
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {existingTask && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
            >
              삭제
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || !startDate || !endDate || endDate < startDate}
            className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {existingTask ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
