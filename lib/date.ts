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
