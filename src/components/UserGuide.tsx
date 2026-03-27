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
      '- 세로축: 날짜 (시즌 범위에 따라 자동 조정)',
      '- 가로축: 시즌별 부서 업무 (기획 / 디자인 / 소재 / 소싱)',
      '- 최신 시즌이 좌측, 이전 시즌이 우측에 배치',
      '- 체크박스로 최대 3개 시즌을 동시에 선택하여 비교 가능 (선택 수에 따라 화면 꽉 차게 동적 조정)',
      '- 시즌 헤더를 드래그 앤 드롭하여 좌우 순서를 자유롭게 변경 가능',
      '- 동일 타입 시즌(예: 27SS + 28SS) 선택 시 비교 모드 자동 활성화 — MM-DD 기준 정렬로 년도별 일정 비교',
      '- 시즌은 동적으로 추가/삭제할 수 있어, 27FW, 28SS 등 새 시즌 확장 가능',
      '',
      '[ 주요 마일스톤 흐름 ]',
      'KICK-OFF → Category Strategy Report → Fabric Development → CAD Report → 1st Sample PLM → 1st Sample Lead Time → 1st Convention → 2nd Sample PLM → 2nd Sample Lead Time → 2nd Convention → OTB Fix → PR/PLM 완료 → PO 발행',
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
    id: 'season',
    title: '3. 시즌 관리',
    content: [
      '헤더의 "Season" 버튼으로 시즌 관리 화면을 엽니다.',
      '',
      '[ 시즌이란? ]',
      '- 시즌은 GTM 일정의 최상위 단위입니다 (예: 26FW, 27SS, 27FW, 28SS ...)',
      '- 각 시즌에는 13개의 기본 마일스톤이 포함됩니다',
      '- 새로운 시즌/년도가 시작될 때마다 시즌을 추가하면 됩니다',
      '',
      '[ 시즌 추가 ]',
      '1. "+ 새 시즌" 버튼 클릭',
      '2. 년도 선택 (예: 2027, 2028 ...)',
      '3. 시즌 타입 선택: SS (Spring/Summer) 또는 FW (Fall/Winter)',
      '4. KICK-OFF 날짜 입력 — 이 날짜 기준으로 13개 마일스톤이 자동 생성됩니다',
      '5. "생성" 클릭',
      '',
      '[ 자동 생성되는 마일스톤 ]',
      '시즌 생성 시 아래 13개 마일스톤이 KICK-OFF 날짜 기준으로 자동 배치됩니다:',
      '- KICK-OFF (1일)',
      '- Category Strategy Report (12일)',
      '- Fabric Development (19일)',
      '- CAD Report (12일)',
      '- 1st Sample PLM (12일)',
      '- 1st Sample Lead Time (42일)',
      '- 1st Convention (2일)',
      '- 2nd Sample PLM (17일)',
      '- 2nd Sample Lead Time (49일)',
      '- 2nd Convention (2일)',
      '- OTB Fix (12일)',
      '- PR / PLM 완료 (5일)',
      '- PO 발행 (5일)',
      '',
      '※ 자동 생성된 마일스톤의 날짜는 이후 Milestone 관리에서 개별 수정 가능합니다.',
      '',
      '[ 시즌 삭제 ]',
      '- 해당 시즌의 "삭제" 클릭 → 확인 팝업',
      '- 시즌 삭제 시 해당 시즌의 모든 마일스톤과 업무가 함께 삭제됩니다',
      '',
      '[ 캘린더 표시 ]',
      '- 시즌 필터 버튼을 클릭하면 체크박스로 최대 3개 시즌을 동시에 선택 가능',
      '- 선택된 시즌 수에 따라 화면이 동적으로 분할 (1개=100%, 2개=50%, 3개=33%)',
      '- 시즌 헤더를 드래그하여 좌우 순서를 변경할 수 있습니다',
      '- 날짜 범위는 등록된 시즌의 시작~종료일에 맞춰 자동으로 조정됩니다',
    ],
  },
  {
    id: 'calendar',
    title: '4. Calendar (일정 관리)',
    content: [
      '[ 일정 보기 ]',
      '- 오늘 날짜: 노란색 배경 강조',
      '- 공휴일: 빨간색 배경, 공휴일명 표시',
      '- 주말: 회색 배경',
      '- 월 첫째 날: 굵은 경계선으로 구분',
      '- Milestone 컬럼: 현재 진행 중인 마일스톤 단계를 색상 바로 표시',
      '- 부서 컬럼: 화면 너비에 맞게 자동 확장되어 넓게 표시',
      '',
      '[ 필터 ]',
      '- 시즌 필터: 체크박스로 최대 3개 시즌 동시 선택 (기본: 최신 2개)',
      '- 부서 필터: 전체 / 기획 / 디자인 / 소재 / 소싱',
      '- 상태 필터: 전체 / 예정 / 진행중 / 완료 / 지연',
      '- "오늘" 버튼: 오늘 날짜로 자동 스크롤',
      '',
      '[ 부서별 검색 필터 (엑셀 방식) ]',
      '- 테이블 헤더의 부서명(기획/디자인/소재/소싱)을 클릭하면 검색 입력란이 열립니다',
      '- 검색어를 입력하면 엑셀 필터처럼 해당 검색어가 포함된 일정이 있는 날짜 행만 표시됩니다',
      '- 매칭되지 않는 날짜는 완전히 숨겨져, 관련 일정만 집중해서 볼 수 있습니다',
      '- 각 시즌의 각 부서가 독립적으로 검색됩니다 (예: 27SS 기획과 28SS 기획은 별도)',
      '- 필터 바에 검색 결과 건수가 표시됩니다 (예: "검색 결과: 15일 / 365일")',
      '- "검색 초기화" 버튼으로 모든 검색을 한 번에 해제할 수 있습니다',
      '- 검색 활성 시 부서명에 밑줄과 * 표시가 나타납니다',
      '- 부서명을 다시 클릭하거나 Esc 키를 누르면 해당 검색이 해제됩니다',
      '',
      '[ 업무 추가 ] (로그인 필요)',
      '1. 원하는 날짜의 빈 셀을 더블클릭',
      '2. 모달에서 부서, 업무 내용, 상태, 마일스톤(선택) 입력',
      '3. "추가" 클릭',
      '',
      '[ 업무 수정 ]',
      '1. 업무가 있는 셀을 더블클릭',
      '2. 모달에서 내용, 상태, 부서, 마일스톤 수정',
      '3. "수정" 클릭',
      '',
      '[ 업무 삭제 ]',
      '- 셀 더블클릭 → 모달 좌측 하단 "삭제" 버튼',
      '',
      '※ 단순 클릭으로는 모달이 열리지 않습니다. 의도적인 더블클릭으로만 동작합니다.',
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
    title: '5. 드래그 앤 드롭',
    content: [
      '로그인 상태에서 업무를 드래그하여 이동하거나 복사할 수 있습니다.',
      '',
      '[ 이동 (드래그 앤 드롭) ]',
      '1. 업무 텍스트를 마우스로 잡고 드래그',
      '2. 상단에 안내 메시지 표시',
      '3. 원하는 셀(다른 날짜, 다른 부서, 다른 시즌)에 드롭',
      '4. 기존 위치에서 새 위치로 이동됨',
      '',
      '[ 복사 (Ctrl + 드롭) ]',
      '1. 업무를 드래그한 상태에서 Ctrl 키를 누른 채로 드롭',
      '2. 원본은 그대로 유지되고, 동일한 내용의 업무가 새 위치에 복사됨',
      '- 같은 시즌 내 다른 날짜로 복사, 다른 시즌으로 복사 모두 가능',
      '',
      '[ 이동/복사 가능 범위 ]',
      '- 날짜 변경: 다른 날짜로 이동/복사',
      '- 부서 변경: 다른 부서로 이동/복사 (예: 기획 → 소싱)',
      '- 시즌 변경: 시즌 간 이동/복사도 가능 (예: 27SS → 26FW)',
      '',
      '※ 읽기 전용 모드에서는 드래그가 비활성화됩니다.',
      '',
      '[ 시즌 헤더 순서 변경 ]',
      '- 시즌이 2개 이상 표시될 때, 시즌 헤더(예: 27SS, 28SS)를 드래그하여 좌우 순서를 변경할 수 있습니다',
      '- 드래그 핸들(⠿) 아이콘이 시즌명 왼쪽에 표시됩니다',
      '- 드래그 중인 헤더는 반투명 처리, 드롭 대상은 테두리로 하이라이트됩니다',
    ],
  },
  {
    id: 'comparison',
    title: '6. 시즌 비교 모드',
    content: [
      '동일 타입의 시즌(SS끼리 또는 FW끼리)을 2개 이상 선택하면 비교 모드가 자동으로 활성화됩니다.',
      '',
      '[ 비교 모드란? ]',
      '- 년도가 다른 같은 타입의 시즌을 MM-DD(월-일) 기준으로 정렬하여 나란히 비교하는 기능입니다',
      '- 예: 27SS와 28SS를 선택하면, 같은 월/일의 일정이 한 행에 나란히 표시됩니다',
      '',
      '[ 자동 활성화 조건 ]',
      '- 선택된 시즌이 2개 이상',
      '- 선택된 시즌이 모두 같은 타입 (모두 SS 또는 모두 FW)',
      '- 조건이 맞으면 필터 바 아래에 "비교 모드" 안내가 표시됩니다',
      '',
      '[ 화면 구성 ]',
      '- 날짜 컬럼: MM-DD (기준 시즌의 월-일) 표시',
      '- 각 시즌 컬럼 앞: 해당 시즌의 실제 날짜(YY-MM-DD) 표시',
      '- 시즌 헤더: 시즌명 + 년도 범위 (예: 27SS (2026~2027))',
      '- 마일스톤/업무: 각 시즌의 실제 날짜 기준으로 표시',
      '',
      '[ 비교 모드 해제 ]',
      '- 시즌을 1개만 선택하거나, 다른 타입의 시즌을 섞어 선택하면 일반 모드로 돌아갑니다',
      '',
      '※ 기준 시즌은 첫 번째 선택된 시즌입니다. 날짜 범위는 기준 시즌의 시작~종료일로 결정됩니다.',
    ],
  },
  {
    id: 'milestone',
    title: '7. 마일스톤 관리',
    content: [
      '헤더의 "Milestone" 버튼으로 마일스톤 관리 화면을 엽니다.',
      '',
      '[ 마일스톤 등록 ]',
      '1. "+ 새 마일스톤" 버튼 클릭',
      '2. 시즌 선택 (등록된 시즌 목록에서 선택)',
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
    title: '8. Excel 내보내기 / 가져오기',
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
      '- 파일명 형식: DUVETICA_GTM_YYYY-MM-DD.xlsx',
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
    title: '9. 알림 / 리마인더',
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
    title: '10. Dashboard (모니터링)',
    content: [
      '상단 "Dashboard" 탭에서 전체 현황을 모니터링합니다.',
      '',
      '[ 시즌별 진행률 ]',
      '- 등록된 모든 시즌의 전체 완료율 (%)',
      '- 상태별 건수: 예정 / 진행중 / 완료 / 지연',
      '- 지연 건수가 있으면 빨간색으로 경고 표시',
      '',
      '[ 부서별 업무 현황 ]',
      '- 기획 / 디자인 / 소재 / 소싱 각 부서의 완료율',
      '- 프로그레스 바로 시각화',
      '',
      '[ 마일스톤 진행률 ]',
      '- 모든 시즌의 마일스톤별 진행률 바',
      '- 상태 표시: 예정 / 진행중 / 완료 / 지연',
      '- 마일스톤에 연결된 업무의 완료 비율로 계산',
      '',
      '[ 향후 7일 내 업무 ]',
      '- 앞으로 1주일 이내에 예정된 미완료 업무 리스트',
    ],
  },
  {
    id: 'data',
    title: '11. 데이터 관리',
    content: [
      '[ 저장 방식 ]',
      '- 로컬 저장: 브라우저 localStorage에 자동 저장 (새로고침 시 유지)',
      '- 서버 동기화: 로그인 상태에서 변경 시 1초 후 자동으로 Redis(Vercel KV) 서버에 동기화',
      '- 동기화 상태: 헤더 우측에 표시 (동기화 중... / 저장됨 / 로컬)',
      '- 서버에 저장된 데이터는 다른 브라우저/기기에서도 로그인하면 불러올 수 있습니다',
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
      '- 로그인하지 않으면 데이터가 브라우저에만 저장됩니다 (서버 동기화 안 됨)',
      '- 서버 동기화가 실패해도 로컬 데이터는 유지됩니다',
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
          <p className="text-[10px] text-gray-400 mt-0.5">DUVETICA GTM v3.0</p>
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
