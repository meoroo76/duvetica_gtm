'use client';

import { useRef, useState } from 'react';
import { useGTMStore } from '@/store/gtmStore';
import { Task, Department, DEPARTMENTS } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ExcelManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExcelManager({ isOpen, onClose }: ExcelManagerProps) {
  const { tasks, milestones, currentUser } = useGTMStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<Task[] | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState('');
  const store = useGTMStore();

  if (!isOpen) return null;

  const exportToExcel = () => {
    // Sheet 1: Tasks
    const taskData = tasks.map((t) => ({
      날짜: t.date,
      시즌: t.season,
      부서: t.department,
      업무내용: t.content,
      상태: t.status,
      마일스톤: milestones.find((m) => m.id === t.milestone)?.name || '',
      작성자: t.createdBy,
      수정일시: t.updatedAt,
    }));

    const ws1 = XLSX.utils.json_to_sheet(taskData);

    // Column widths
    ws1['!cols'] = [
      { wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 40 },
      { wch: 10 }, { wch: 24 }, { wch: 10 }, { wch: 20 },
    ];

    // Sheet 2: Milestones
    const msData = milestones.map((m) => ({
      ID: m.id,
      시즌: m.season,
      마일스톤: m.name,
      시작일: m.startDate,
      종료일: m.endDate,
      색상: m.color,
      순서: m.order,
    }));

    const ws2 = XLSX.utils.json_to_sheet(msData);
    ws2['!cols'] = [
      { wch: 20 }, { wch: 6 }, { wch: 24 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 6 },
    ];

    // Sheet 3: Summary by season+dept
    const summaryRows: Record<string, Record<string, number>> = {};
    for (const t of tasks) {
      const key = `${t.season}_${t.department}`;
      if (!summaryRows[key]) {
        summaryRows[key] = { total: 0, pending: 0, in_progress: 0, completed: 0, delayed: 0 };
      }
      summaryRows[key].total++;
      summaryRows[key][t.status]++;
    }

    const summaryData = Object.entries(summaryRows).map(([key, counts]) => {
      const [season, dept] = key.split('_');
      return {
        시즌: season,
        부서: dept,
        전체: counts.total,
        예정: counts.pending,
        진행중: counts.in_progress,
        완료: counts.completed,
        지연: counts.delayed,
        완료율: counts.total > 0 ? `${Math.round((counts.completed / counts.total) * 100)}%` : '0%',
      };
    });

    const ws3 = XLSX.utils.json_to_sheet(summaryData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, '업무 목록');
    XLSX.utils.book_append_sheet(wb, ws2, '마일스톤');
    XLSX.utils.book_append_sheet(wb, ws3, '요약');

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `DUVETICA_GTM_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

        const parsed: Task[] = rows.map((row) => {
          const season = (row['시즌'] || '26FW') as '27SS' | '26FW';
          const dept = (row['부서'] || '기획') as Department;
          const statusMap: Record<string, Task['status']> = {
            '예정': 'pending', '진행중': 'in_progress', '완료': 'completed', '지연': 'delayed',
            'pending': 'pending', 'in_progress': 'in_progress', 'completed': 'completed', 'delayed': 'delayed',
          };

          if (!row['날짜'] || !row['업무내용']) {
            throw new Error('필수 컬럼 누락: 날짜, 업무내용');
          }

          // Handle date format - might be date serial or string
          let dateStr = row['날짜'];
          if (/^\d+$/.test(dateStr)) {
            const d = XLSX.SSF.parse_date_code(parseInt(dateStr));
            dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
          }

          // Find milestone by name
          const msName = row['마일스톤'] || '';
          const ms = milestones.find((m) => m.name === msName && m.season === season);

          return {
            id: uuidv4(),
            date: dateStr,
            season,
            department: DEPARTMENTS.includes(dept) ? dept : '기획',
            content: row['업무내용'],
            status: statusMap[row['상태']] || 'pending',
            milestone: ms?.id,
            createdBy: currentUser?.username || 'import',
            updatedAt: new Date().toISOString(),
          };
        });

        setImportPreview(parsed);
      } catch (err) {
        setImportError(`파일 파싱 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    if (!importPreview || !currentUser) return;

    if (importMode === 'replace') {
      // Replace all tasks
      useGTMStore.setState({ tasks: importPreview });
    } else {
      // Merge - add new tasks
      useGTMStore.setState((state) => ({ tasks: [...state.tasks, ...importPreview] }));
    }

    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Excel 내보내기 / 가져오기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Export */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-bold text-sm text-gray-800 mb-2">내보내기 (Export)</h3>
            <p className="text-xs text-gray-500 mb-3">
              현재 전체 업무({tasks.length}건)와 마일스톤({milestones.length}개)을 Excel 파일로 다운로드합니다.
            </p>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel 다운로드
            </button>
          </div>

          {/* Import */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-bold text-sm text-gray-800 mb-2">가져오기 (Import)</h3>
            <p className="text-xs text-gray-500 mb-1">
              Excel 파일의 첫번째 시트에서 업무를 가져옵니다.
            </p>
            <p className="text-xs text-gray-400 mb-3">
              필수 컬럼: <code className="bg-gray-100 px-1 rounded">날짜</code>, <code className="bg-gray-100 px-1 rounded">업무내용</code>
              &nbsp;|&nbsp; 선택: <code className="bg-gray-100 px-1 rounded">시즌</code>, <code className="bg-gray-100 px-1 rounded">부서</code>, <code className="bg-gray-100 px-1 rounded">상태</code>, <code className="bg-gray-100 px-1 rounded">마일스톤</code>
            </p>

            {!currentUser ? (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">로그인 후 가져오기가 가능합니다.</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs text-gray-600">가져오기 방식:</label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="radio"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-blue-600"
                    />
                    기존에 추가 (병합)
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="radio"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-red-600"
                    />
                    전체 교체 (위험)
                  </label>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </>
            )}

            {importError && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{importError}</div>
            )}

            {importPreview && (
              <div className="mt-3">
                <div className="text-xs text-gray-700 mb-2 font-medium">
                  미리보기: {importPreview.length}건 가져오기
                  {importMode === 'replace' && (
                    <span className="text-red-600 ml-2">(기존 {tasks.length}건 삭제됨)</span>
                  )}
                </div>
                <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded">
                  <table className="w-full text-[11px]">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">날짜</th>
                        <th className="px-2 py-1 text-left">시즌</th>
                        <th className="px-2 py-1 text-left">부서</th>
                        <th className="px-2 py-1 text-left">업무</th>
                        <th className="px-2 py-1 text-left">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 20).map((t) => (
                        <tr key={t.id} className="border-t border-gray-100">
                          <td className="px-2 py-1">{t.date}</td>
                          <td className="px-2 py-1">{t.season}</td>
                          <td className="px-2 py-1">{t.department}</td>
                          <td className="px-2 py-1 truncate max-w-[200px]">{t.content}</td>
                          <td className="px-2 py-1">{t.status}</td>
                        </tr>
                      ))}
                      {importPreview.length > 20 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-1 text-center text-gray-400">
                            ... 외 {importPreview.length - 20}건
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={confirmImport}
                    className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                  >
                    가져오기 확인
                  </button>
                  <button
                    onClick={() => {
                      setImportPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-1.5 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
