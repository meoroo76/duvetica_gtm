import { test, expect, Page } from '@playwright/test';

const LOGIN = { username: 'admin', password: 'duvetica2025!' };

// 26FW 시즌 범위: 2025-05-16 ~ 2026-01-05
// 캘린더 날짜 범위: 2025-05-01 ~ 2026-12-31 (시즌 startDate 월 1일부터 endDate 년도 12/31까지)
const TEST_DATE = '2025-06-02';
const TARGET_DATE = '2025-06-03';
const SEASON = '26FW';
const DEPT = '기획';
const ROW_HEIGHT = 32;

async function login(page: Page) {
  await page.getByTestId('open-login-btn').click();
  await page.getByTestId('login-username').fill(LOGIN.username);
  await page.getByTestId('login-password').fill(LOGIN.password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('open-login-btn')).not.toBeVisible({ timeout: 5000 });
}

async function scrollToCellByDate(page: Page, targetDate: string) {
  // 스토어의 allDates 배열에서 targetDate의 인덱스를 찾아 정확히 스크롤
  await page.evaluate(({ date, rowH }) => {
    const container = document.querySelector('.overflow-auto');
    if (!container) return;
    // allDates를 시작일부터 계산: 캘린더가 시즌 시작월 1일부터 시작
    // 간접 추산: 날짜 차이로 인덱스를 계산
    // 실제로는 data-testid가 있는 셀을 DOM에서 찾되, 가상 스크롤이므로 먼저 대략적 위치로 스크롤
    const startDate = new Date('2025-05-01');
    const target = new Date(date);
    const diffDays = Math.floor((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    container.scrollTop = Math.max(0, (diffDays - 5) * rowH);
  }, { date: targetDate, rowH: ROW_HEIGHT });
  await page.waitForTimeout(300);
}

async function addTaskViaUI(page: Page, date: string, season: string, dept: string, content: string) {
  await scrollToCellByDate(page, date);

  const cellSelector = `[data-testid="cell-${date}-${season}-${dept}"]`;
  const cell = page.locator(cellSelector);
  await expect(cell).toBeVisible({ timeout: 5000 });

  // 더블클릭으로 TaskModal 열기
  await cell.dblclick();

  // TaskModal 대기 - "업무 추가" 제목이 포함된 모달
  const modal = page.locator('.fixed.inset-0').last();
  await expect(modal.locator('text=업무 추가')).toBeVisible({ timeout: 5000 });

  // textarea에 content 입력
  await modal.locator('textarea').fill(content);

  // "추가" 버튼 클릭
  await modal.locator('button', { hasText: '추가' }).click();

  // 모달 닫힘 대기
  await expect(modal).not.toBeVisible({ timeout: 5000 });

  // 셀에 태스크가 표시될 때까지 대기
  await expect(cell).toContainText(content, { timeout: 5000 });
}

test.describe('셀 복사/잘라내기/붙여넣기', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // localStorage 초기화 후 reload로 깨끗한 상태 확보
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await login(page);
  });

  test('Ctrl+C 복사 후 Ctrl+V 붙여넣기 - 원본 유지, 대상에 복사', async ({ page }) => {
    // 1. 태스크 생성
    await addTaskViaUI(page, TEST_DATE, SEASON, DEPT, '복사테스트');

    // 2. 원본 셀 클릭하여 선택
    const sourceCell = page.locator(`[data-testid="cell-${TEST_DATE}-${SEASON}-${DEPT}"]`);
    await sourceCell.click();

    // 3. Ctrl+C 복사
    await page.keyboard.press('Control+c');

    // 4. 클립보드 인디케이터 확인
    const clipInd = page.getByTestId('clipboard-indicator');
    await expect(clipInd).toBeVisible({ timeout: 3000 });
    await expect(clipInd).toContainText('복사됨');
    await expect(clipInd).toContainText('복사테스트');

    // 5. 대상 셀 선택
    await scrollToCellByDate(page, TARGET_DATE);
    const targetCell = page.locator(`[data-testid="cell-${TARGET_DATE}-${SEASON}-${DEPT}"]`);
    await expect(targetCell).toBeVisible({ timeout: 3000 });
    await targetCell.click();

    // 6. Ctrl+V 붙여넣기
    await page.keyboard.press('Control+v');

    // 7. 대상 셀에 복사되었는지 확인
    await expect(targetCell).toContainText('복사테스트', { timeout: 5000 });

    // 8. 원본 셀에도 여전히 존재 (복사이므로)
    await scrollToCellByDate(page, TEST_DATE);
    await expect(sourceCell).toContainText('복사테스트', { timeout: 5000 });

    // 9. 클립보드 유지 (복사 모드 → 다중 붙여넣기 가능)
    await expect(clipInd).toBeVisible();
  });

  test('Ctrl+X 잘라내기 후 Ctrl+V 붙여넣기 - 원본 제거, 대상으로 이동', async ({ page }) => {
    // 1. 태스크 생성
    await addTaskViaUI(page, TEST_DATE, SEASON, DEPT, '잘라내기테스트');

    // 2. 원본 셀 선택
    const sourceCell = page.locator(`[data-testid="cell-${TEST_DATE}-${SEASON}-${DEPT}"]`);
    await sourceCell.click();

    // 3. Ctrl+X 잘라내기
    await page.keyboard.press('Control+x');

    // 4. 클립보드 인디케이터 확인
    const clipInd = page.getByTestId('clipboard-indicator');
    await expect(clipInd).toBeVisible({ timeout: 3000 });
    await expect(clipInd).toContainText('잘라냄');

    // 5. 원본 태스크가 반투명으로 표시
    await expect(sourceCell.locator('.opacity-40')).toBeVisible();

    // 6. 대상 셀 선택
    await scrollToCellByDate(page, TARGET_DATE);
    const targetCell = page.locator(`[data-testid="cell-${TARGET_DATE}-${SEASON}-${DEPT}"]`);
    await expect(targetCell).toBeVisible({ timeout: 3000 });
    await targetCell.click();

    // 7. Ctrl+V 붙여넣기
    await page.keyboard.press('Control+v');

    // 8. 대상 셀에 이동되었는지 확인
    await expect(targetCell).toContainText('잘라내기테스트', { timeout: 5000 });

    // 9. 원본 셀에서 제거되었는지 확인
    await scrollToCellByDate(page, TEST_DATE);
    await expect(sourceCell).not.toContainText('잘라내기테스트', { timeout: 5000 });

    // 10. 클립보드 비워짐 (잘라내기 후 붙여넣기 → 초기화)
    await expect(clipInd).not.toBeVisible();
  });

  test('복사 후 여러 번 붙여넣기 가능', async ({ page }) => {
    const thirdDate = '2025-06-04';

    await addTaskViaUI(page, TEST_DATE, SEASON, DEPT, '다중붙여넣기');

    // 복사
    const sourceCell = page.locator(`[data-testid="cell-${TEST_DATE}-${SEASON}-${DEPT}"]`);
    await sourceCell.click();
    await page.keyboard.press('Control+c');

    // 첫 번째 붙여넣기
    await scrollToCellByDate(page, TARGET_DATE);
    const target1 = page.locator(`[data-testid="cell-${TARGET_DATE}-${SEASON}-${DEPT}"]`);
    await expect(target1).toBeVisible({ timeout: 3000 });
    await target1.click();
    await page.keyboard.press('Control+v');
    await expect(target1).toContainText('다중붙여넣기', { timeout: 5000 });

    // 두 번째 붙여넣기
    await scrollToCellByDate(page, thirdDate);
    const target2 = page.locator(`[data-testid="cell-${thirdDate}-${SEASON}-${DEPT}"]`);
    await expect(target2).toBeVisible({ timeout: 3000 });
    await target2.click();
    await page.keyboard.press('Control+v');
    await expect(target2).toContainText('다중붙여넣기', { timeout: 5000 });

    // 클립보드 유지
    await expect(page.getByTestId('clipboard-indicator')).toBeVisible();
  });

  test('셀 선택 없이 단축키 사용 시 아무 동작 안 함', async ({ page }) => {
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+x');
    await page.keyboard.press('Control+v');
    await expect(page.getByTestId('clipboard-indicator')).not.toBeVisible();
  });

  test('빈 셀에서 복사 시 클립보드에 아무것도 설정되지 않음', async ({ page }) => {
    await scrollToCellByDate(page, TEST_DATE);
    const emptyCell = page.locator(`[data-testid="cell-${TEST_DATE}-${SEASON}-${DEPT}"]`);
    await expect(emptyCell).toBeVisible({ timeout: 5000 });
    await emptyCell.click();

    await page.keyboard.press('Control+c');
    await expect(page.getByTestId('clipboard-indicator')).not.toBeVisible();
  });

  test('다른 부서 셀로 붙여넣기', async ({ page }) => {
    const targetDept = '디자인';

    await addTaskViaUI(page, TEST_DATE, SEASON, DEPT, '부서이동테스트');

    // 복사
    const sourceCell = page.locator(`[data-testid="cell-${TEST_DATE}-${SEASON}-${DEPT}"]`);
    await sourceCell.click();
    await page.keyboard.press('Control+c');

    // 디자인 부서 셀에 붙여넣기
    const targetCell = page.locator(`[data-testid="cell-${TEST_DATE}-${SEASON}-${targetDept}"]`);
    await expect(targetCell).toBeVisible({ timeout: 3000 });
    await targetCell.click();
    await page.keyboard.press('Control+v');

    await expect(targetCell).toContainText('부서이동테스트', { timeout: 5000 });
  });
});
