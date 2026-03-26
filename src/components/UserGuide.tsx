'use client';

import { useState } from 'react';

const sections = [
  {
    id: 'overview',
    title: '1. 개요',
    content: [
      'DUVETICA GTM Schedule은 시즌별 Go-To-Market 일정을 수립하고 모니터링하는 도구입니다.',
      '',
      '[ 핵심 구조 ]',
      '- 세로축: 날짜 (2025.05 ~ 2026.12)',
      '- 가로축: 부서별 업무 (기획 / 디자인 / 소재 / 소싱)',
      '- 좌측: 27SS 시즌  |  우측: 26FW 시즌',
      '- 두 시즌이 나란히 표시되어 겹치는 일정을 한눈에 파악 가능',
      '',
      '[ 주요 마일스톤 흐름 ]',
      'KICK-OFF → Category Strategy Report → Fabric Development → CAD Report → Sample PLM → Sample Lead Time → Convention → OTB Fix → PR/PLM 완료 → PO 발행',
    ],
  },
  {
    id: 'login',
    title: '2. 로그인 / 인증',
    content: [
      '일정 조회는 누구나 가능하지만, 수정/추가/삭제는 로그인 후에만 가능합니다.',
      '',
      '[ 로그인 방법 ]',
      '1. 상단 노란색 바의 "로그인" 버튼 클릭',
      '2. 아이디와 비밀번호 입력',
      '',
      '[ 등록된 계정 ]',
      '|아이디|비밀번호|표시명|',
      '|admin|duvetica2025!|관리자|',
      '|planner|plan2025!|기획팀|',
      '|manager|mgr2025!|매니저|',
      '',
      '로그아웃: 우측 상단 "로그아웃" 버튼',
    ],
  },
  {
    id: 'calendar',
    title: '3. Calendar (일정 관리)',
    content: [
      '[ 일정 보기 ]',
      '- 오늘 날짜: 노란색 배경 강조',
      '- 공휴일: 빨간색 배경, 공휴일명 표시',
      '- 주말: 회색 배경',
      '- 월 첫째 날: 굵은 경계선으로 구분',
      '- Milestone 컬럼: 현재 진행 중인 마일스톤 단계를 색상 바로 표시',
      '',
      '[ 필터 ]',
      '- 시즌 필터: 전체 / 27SS / 26FW',
      '- 부서 필터: 전체 / 기획 / 디자인 / 소재 / 소싱',
      '- 상태 필터: 전체 / 예정 / 진행중 / 완료 / 지연',
      '- "오늘" 버튼: 오늘 날짜로 자동 스크롤',
      '',
      '[ 업무 추가 ] (로그인 필요)',
      '1. 원하는 날짜의 빈 셀 클릭',
      '2. 모달에서 부서, 업무 내용, 상태, 마일스톤(선택) 입력',
      '3. "추가" 클릭',
      '',
      '[ 업무 수정 ]',
      '1. 업무가 있는 셀 클릭',
      '2. 모달에서 내용, 상태, 부서, 마일스톤 수정',
      '3. "수정" 클릭',
      '',
      '[ 업무 삭제 ]',
      '- 셀 클릭 → 모달 좌측 하단 "삭제" 버튼',
      '',
      '[ 업무 상태 ]',
      '|상태|색상|설명|',
      '|예정|회색|아직 시작 전|',
      '|진행중|파란색|현재 진행 중|',
      '|완료|초록색|완료됨|',
      '|지연|빨간색|예정일 초과|',
    ],
  },
  {
    id: 'dragdrop',
    title: '4. 드래그 앤 드롭',
    content: [
      '로그인 상태에서 업무를 드래그하여 다른 셀로 이동할 수 있습니다.',
      '',
      '[ 사용법 ]',
      '1. 업무 텍스트를 마우스로 잡고 드래그',
      '2. 상단에 파란색 "이동 중..." 안내 메시지 표시',
      '3. 원하는 셀(다른 날짜, 다른 부서, 다른 시즌)로 드롭',
      '4. 드롭 대상 셀이 파란색 하이라이트로 표시됨',
      '',
      '[ 이동 가능 범위 ]',
      '- 날짜 변경: 다른 날짜로 이동',
      '- 부서 변경: 다른 부서로 이동 (예: 기획 → 소싱)',
      '- 시즌 변경: 27SS ↔ 26FW 간 이동도 가능',
      '',
      '※ 읽기 전용 모드에서는 드래그가 비활성화됩니다.',
    ],
  },
  {
    id: 'milestone',
    title: '5. 마일스톤 관리',
    content: [
      '헤더의 "Milestone" 버튼으로 마일스톤 관리 화면을 엽니다.',
      '',
      '[ 마일스톤 등록 ]',
      '1. "+ 새 마일스톤" 버튼 클릭',
      '2. 시즌 선택 (26FW / 27SS)',
      '3. 유형 선택 드롭다운에서 템플릿 선택',
      '   - KICK-OFF, Category Strategy Report, Fabric Development, CAD Report,',
      '   - Sample PLM, Sample Lead Time, Convention, OTB Fix, PR/PLM 완료, PO 발행',
      '   - "직접 입력"을 선택하면 자유롭게 이름 입력 가능',
      '4. 시작일, 종료일 설정',
      '5. 색상 선택',
      '6. "등록" 클릭',
      '',
      '[ 자동 차수 부여 ]',
      '동일 시즌에 같은 유형의 마일스톤을 여러 번 등록하면 자동으로 차수가 붙습니다:',
      '- 첫 번째: Sample PLM',
      '- 두 번째: Sample PLM (2차)',
      '- 세 번째: Sample PLM (3차)',
      '- 드롭다운에서 미리보기 확인 가능',
      '',
      '[ 마일스톤 수정 ]',
      '- 테이블에서 "수정" 클릭 → 인라인 편집 → "저장"',
      '- 이름, 시작일, 종료일, 색상 모두 변경 가능',
      '',
      '[ 마일스톤 삭제 ]',
      '- "삭제" 클릭 → 확인 팝업',
      '- 연결된 업무가 있으면 몇 건인지 안내됨 (연결 해제 후 삭제)',
    ],
  },
  {
    id: 'excel',
    title: '6. Excel 내보내기 / 가져오기',
    content: [
      '헤더의 "Excel" 버튼으로 Excel 관리 화면을 엽니다.',
      '',
      '[ 내보내기 (Export) ]',
      '- "Excel 다운로드" 클릭',
      '- 3개 시트가 포함된 .xlsx 파일 다운로드:',
      '',
      '|시트|내용|',
      '|업무 목록|전체 업무 데이터 (날짜, 시즌, 부서, 내용, 상태, 마일스톤)|',
      '|마일스톤|전체 마일스톤 데이터|',
      '|요약|시즌×부서별 업무 통계 (완료율 포함)|',
      '',
      '- 파일명 형식: DUVETICA_GTM_2026-03-26.xlsx',
      '',
      '[ 가져오기 (Import) ] — 로그인 필요',
      '1. 가져오기 방식 선택:',
      '   - 기존에 추가 (병합): 기존 데이터 유지 + 새 데이터 추가',
      '   - 전체 교체: 기존 데이터 삭제 후 새 데이터로 대체 (주의!)',
      '2. Excel 파일 선택 (.xlsx, .xls)',
      '3. 미리보기 테이블에서 데이터 확인',
      '4. "가져오기 확인" 클릭',
      '',
      '[ Excel 파일 형식 ]',
      '|컬럼명|필수|예시|',
      '|날짜|O|2025-07-14|',
      '|업무내용|O|소재 투입 시작|',
      '|시즌|X (기본: 26FW)|27SS|',
      '|부서|X (기본: 기획)|디자인|',
      '|상태|X (기본: 예정)|진행중|',
      '|마일스톤|X|1st Sample PLM|',
    ],
  },
  {
    id: 'notification',
    title: '7. 알림 / 리마인더',
    content: [
      '헤더의 "알림" 버튼으로 알림 패널을 엽니다. 빨간 배지로 알림 건수가 표시됩니다.',
      '',
      '[ 알림 유형 ]',
      '|유형|색상|조건|',
      '|긴급|빨간색|예정일 지남 + 미완료 (D+N일 지연)|',
      '|주의|주황색|오늘 마감 업무, 마일스톤 마감 D-3 이내|',
      '|예정|파란색|D-3 이내 예정 업무, 마일스톤 시작 예정|',
      '',
      '[ 기능 ]',
      '- 개별 읽음 처리: 각 알림의 "x" 클릭',
      '- 모두 읽음: 상단 "모두 읽음" 버튼',
      '- 브라우저 알림: 권한 허용 시 긴급 알림을 데스크톱 알림으로 발송',
      '',
      '※ 업무 상태를 "완료"로 변경하면 해당 알림이 사라집니다.',
    ],
  },
  {
    id: 'dashboard',
    title: '8. Dashboard (모니터링)',
    content: [
      '상단 "Dashboard" 탭에서 전체 현황을 모니터링합니다.',
      '',
      '[ 시즌별 진행률 ]',
      '- 26FW / 27SS 각각의 전체 완료율 (%)',
      '- 상태별 건수: 예정 / 진행중 / 완료 / 지연',
      '- 지연 건수가 있으면 빨간색으로 경고 표시',
      '',
      '[ 부서별 업무 현황 ]',
      '- 기획 / 디자인 / 소재 / 소싱 각 부서의 완료율',
      '- 프로그레스 바로 시각화',
      '',
      '[ 마일스톤 진행률 ]',
      '- 각 마일스톤별 진행률 바',
      '- 상태 표시: 예정 / 진행중 / 완료 / 지연',
      '- 마일스톤에 연결된 업무의 완료 비율로 계산',
      '',
      '[ 향후 7일 내 업무 ]',
      '- 앞으로 1주일 이내에 예정된 미완료 업무 리스트',
    ],
  },
  {
    id: 'data',
    title: '9. 데이터 관리',
    content: [
      '[ 저장 방식 ]',
      '- 모든 데이터는 브라우저 localStorage에 자동 저장',
      '- 새로고침해도 데이터가 유지됩니다',
      '- 브라우저 캐시를 삭제하면 데이터가 초기화됩니다',
      '',
      '[ 데이터 백업 ]',
      '- 정기적으로 Excel 내보내기로 백업하는 것을 권장',
      '- 내보낸 Excel 파일을 다시 가져오기하면 복원 가능',
      '',
      '[ 데이터 초기화 ]',
      '- 브라우저 개발자도구(F12) > Application > Local Storage',
      '- duvetica-gtm-storage 항목 삭제 후 새로고침',
      '',
      '[ 주의사항 ]',
      '- 다른 브라우저 또는 시크릿 모드에서는 별도의 데이터입니다',
      '- 여러 사용자가 동시에 작업 시 각자의 브라우저에 별도 저장됩니다',
    ],
  },
];

export default function UserGuide() {
  const [activeSection, setActiveSection] = useState('overview');
  const current = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-[220px] bg-gray-50 border-r border-gray-200 overflow-y-auto shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">사용 설명서</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">DUVETICA GTM v1.0</p>
        </div>
        <nav className="p-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors mb-0.5 ${
                activeSection === s.id
                  ? 'bg-white text-gray-900 font-semibold shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6">
          <h1 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-gray-200">
            {current.title}
          </h1>
          <div className="space-y-0">
            {current.content.map((line, i) => (
              <GuideLine key={`${current.id}-${i}`} line={line} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideLine({ line }: { line: string }) {
  // Empty line = spacer
  if (!line) return <div className="h-3" />;

  // Section header [ ... ]
  if (line.startsWith('[ ') && line.endsWith(' ]')) {
    return (
      <h3 className="text-sm font-bold text-gray-800 mt-5 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
        {line.slice(2, -2)}
      </h3>
    );
  }

  // Table row |...|
  if (line.startsWith('|') && line.endsWith('|')) {
    const cells = line.split('|').filter(Boolean);
    return (
      <div className="flex text-xs border-b border-gray-100">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`px-3 py-1.5 flex-1 ${i === 0 ? 'font-medium text-gray-700 bg-gray-50' : 'text-gray-600'}`}
          >
            {cell.trim()}
          </div>
        ))}
      </div>
    );
  }

  // Numbered list
  const numMatch = line.match(/^(\d+)\.\s+(.+)/);
  if (numMatch) {
    return (
      <div className="flex items-start gap-2 py-0.5 pl-2">
        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          {numMatch[1]}
        </span>
        <span className="text-sm leading-relaxed text-gray-700">{numMatch[2]}</span>
      </div>
    );
  }

  // Bullet list
  if (line.startsWith('- ')) {
    return (
      <div className="flex items-start gap-2 py-0.5 pl-2">
        <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 shrink-0" />
        <span className="text-sm leading-relaxed text-gray-700">{line.slice(2)}</span>
      </div>
    );
  }

  // Indented (sub-item)
  if (line.startsWith('   - ') || line.startsWith('   ')) {
    return (
      <div className="pl-8 text-sm text-gray-500 leading-relaxed py-0.5">
        {line.trim().startsWith('- ') ? (
          <span className="flex items-start gap-2">
            <span className="w-1 h-1 bg-gray-300 rounded-full mt-2 shrink-0" />
            <span>{line.trim().slice(2)}</span>
          </span>
        ) : (
          line.trim()
        )}
      </div>
    );
  }

  // Note ※
  if (line.startsWith('※')) {
    return (
      <div className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded mt-2 border-l-3 border-blue-400">
        {line}
      </div>
    );
  }

  // Regular text
  return <p className="text-sm leading-relaxed text-gray-700 my-1">{line}</p>;
}
