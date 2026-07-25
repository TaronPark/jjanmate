/**
 * KST(UTC+9) 기준 날짜 문자열 유틸.
 *
 * 왜 필요한가: Vercel 서버리스 함수는 기본적으로 UTC로 동작해서, `new Date()`를 그대로 써서
 * "오늘"/"어제"를 비교하면 한국 시간 자정 근처(UTC 기준 오후 3시~자정 사이)에 날짜가 하루씩
 * 밀리는 버그가 생긴다. 스트릭 쓰기(lib/streak.ts)와 읽기(app/feed/[niche]/page.tsx의 유효
 * 스트릭 파생 계산) 양쪽에서 반드시 이 함수를 공유해서 써야 두 로직의 "오늘" 기준이 어긋나지
 * 않는다.
 *
 * 반환 형식은 'YYYY-MM-DD' — Postgres의 `date` 타입(profiles.last_post_date)이 supabase-js를
 * 통해 조회될 때 이 형식의 문자열로 오기 때문에 별도 파싱 없이 바로 비교 가능하다.
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
