/**
 * KST(UTC+9) 기준 날짜 문자열 유틸.
 *
 * 왜 필요한가: Vercel 서버리스 함수는 기본적으로 UTC로 동작해서, `new Date()`를 그대로 써서
 * "오늘"/"어제"를 비교하면 한국 시간 자정 근처(UTC 기준 오후 3시~자정 사이)에 날짜가 하루씩
 * 밀리는 버그가 생긴다.
 *
 * 2026-08-02 피벗으로 원래 용도였던 스트릭(lib/streak.ts, 이제 삭제됨) 계산은 사라졌지만,
 * 같은 "KST 기준 오늘" 판정이 필요한 배치성 로직(app/api/cron/monthly-badges의 "매달 1일인가"
 * 판정, app/write/actions.ts의 초안 24시 만료 계산)에서 계속 재사용 중이라 이 유틸 자체는 유효함.
 *
 * 반환 형식은 'YYYY-MM-DD' — Postgres의 `date` 타입이 supabase-js를 통해 조회될 때 이 형식의
 * 문자열로 오기 때문에 별도 파싱 없이 바로 비교 가능하다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * KST 기준 날짜 문자열('YYYY-MM-DD')을 반환한다.
 * @param offsetDays 기준일로부터 며칠 전/후인지 (0=오늘, -1=어제)
 */
export function getKstDateString(offsetDays = 0): string {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS + offsetDays * 24 * 60 * 60 * 1000);
  return kstNow.toISOString().slice(0, 10);
}

export function getTodayKst(): string {
  return getKstDateString(0);
}

export function getYesterdayKst(): string {
  return getKstDateString(-1);
}

/**
 * 현재 KST 기준 "시(hour, 0~23)"를 반환한다.
 * 2026-07-25 (시드 콘텐츠 드립 크론) 추가 — 시간대별 발행 비중 계산에 사용.
 * getUTCHours()를 쓰는 이유는 getKstDateString과 동일: KST_OFFSET_MS를 더한 뒤
 * "UTC 접근자"로 읽어야 서버 실행 환경의 로컬 타임존과 무관하게 항상 KST 기준 값이 나온다
 * (Vercel은 기본 UTC라 지금은 결과가 같지만, 로컬 개발 환경 등 다른 타임존에서 실행돼도 안전하도록).
 */
export function getKstHour(): number {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  return kstNow.getUTCHours();
}

/**
 * launchDateKst('YYYY-MM-DD', KST 기준 날짜)로부터 오늘까지 "런칭 몇 일차"인지 계산한다.
 * 2026-07-25 (시드 콘텐츠 드립 크론, 테이퍼링 로직) 추가.
 *
 * 반드시 달력 날짜(day) 단위로 diff해야 한다 — new Date() 밀리초 차를 그대로 나누면
 * 시각에 따라 하루가 밀리는 오차가 생길 수 있다(운영 스팟체크 쿼리에서 잡았던 것과 같은 종류의
 * 버그). 두 날짜 문자열을 각각 UTC 자정 기준 타임스탬프로 파싱해 순수하게 "날짜 개수" 차이만
 * 계산한다(한국은 DST가 없어 이 방식이 항상 안전함).
 *
 * 런칭일 당일을 "1일차"로 취급(daysSinceLaunch=1). 아직 런칭 전(diff가 음수)이거나 런칭
 * 당일이면 1로 clamp — 배포 직후 런칭 전 테스트 트리거에서도 Phase 1 로직이 그대로 동작하게 함.
 */
export function getKstDaysSinceLaunch(launchDateKst: string): number {
  const toUtcMs = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };

  const launchMs = toUtcMs(launchDateKst);
  const todayMs = toUtcMs(getTodayKst());
  const dayDiff = Math.round((todayMs - launchMs) / (24 * 60 * 60 * 1000));

  return Math.max(1, dayDiff + 1);
}

/**
 * 게시글 등의 타임스탬프를 사람 친화적인 상대 시간 문자열로 변환한다.
 * 2026-07-26 (UI/UX 개편, docs/짠메이트_프론트엔드_UIUX_개편_스펙.md 참고) — date-fns/dayjs
 * 신규 설치 없이, 필요한 표기 단계만 직접 구현한다(번들 크기 방어 원칙).
 *
 * 단계: 방금 전(1분 미만) -> N분 전(1시간 미만) -> N시간 전(24시간 미만) -> 어제(24~48시간) ->
 * 그 이전은 절대 날짜(YYYY.MM.DD, KST 기준).
 *
 * "어제"는 정확한 KST 달력일 비교가 아니라 24~48시간 경과 여부로만 판단하는 단순화된 근사치다 —
 * 피드 카드 표기용으로는 이 정도 정밀도면 충분하고, 스트릭 계산(lib/date.ts의 KST 달력일 비교)과는
 * 별개의 용도이므로 혼용하지 않는다.
 */
export function getRelativeTimeKo(dateInput: string | Date): string {
  const past = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diffMs = Date.now() - past.getTime();

  if (diffMs < 0 || diffMs < 60 * 1000) return '방금 전';

  const diffMin = diffMs / (60 * 1000);
  if (diffMin < 60) return `${Math.floor(diffMin)}분 전`;

  const diffHour = diffMin / 60;
  if (diffHour < 24) return `${Math.floor(diffHour)}시간 전`;

  const diffDay = diffHour / 24;
  if (diffDay < 2) return '어제';

  const kst = new Date(past.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  return `${y}.${m}.${d}.`;
}
