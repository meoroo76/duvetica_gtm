'use client';

import { useState, useEffect } from 'react';
import { Task, Department, DEPARTMENTS, STATUS_LABELS } from '@/lib/types';
import { useGTMStore } from '@/store/gtmStore';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  season: '27SS' | '26FW';
  department: Department;
  existingTask?: Task;
}

export default function TaskModal({
  isOpen,
  onClose,
  date,
  season,
  department,
  existingTask,
}: TaskModalProps) {
  const { addTask, updateTask, deleteTask, currentUser, milestones } = useGTMStore();
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [dept, setDept] = useState<Department>(department);

  useEffect(() => {
    if (existingTask) {
      setContent(existingTask.content);
      setStatus(existingTask.status);
      setSelectedMilestone(existingTask.milestone || '');
      setDept(existingTask.department);
    } else {
      setContent('');
      setStatus('pending');
      setSelectedMilestone('');
      setDept(department);
    }
  }, [existingTask, department]);

  if (!isOpen || !currentUser) return null;

  const seasonMilestones = milestones.filter((m) => m.season === season);

  const handleSave = () => {
    if (!content.trim()) return;
    if (existingTask) {
      updateTask(existingTask.id, {
        content,
        status,
        milestone: selectedMilestone || undefined,
        department: dept,
      });
    } else {
      addTask({
        date,
        season,
        department: dept,
        content,
        status,
        milestone: selectedMilestone || undefined,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingTask && confirm('이 업무를 삭제하시겠습니까?')) {
      deleteTask(existingTask.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {existingTask ? '업무 수정' : '업무 추가'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <div className="text-sm text-gray-500 mb-4 flex gap-3">
          <span className="px-2 py-1 bg-gray-100 rounded font-medium">{date}</span>
          <span className={`px-2 py-1 rounded font-medium ${
            season === '27SS' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {season}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as Department)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">업무 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              placeholder="업무 내용을 입력하세요"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Task['status'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              {(Object.keys(STATUS_LABELS) as Task['status'][]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">마일스톤 (선택)</label>
            <select
              value={selectedMilestone}
              onChange={(e) => setSelectedMilestone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="">없음</option>
              {seasonMilestones.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
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
            className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800"
          >
            {existingTask ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
