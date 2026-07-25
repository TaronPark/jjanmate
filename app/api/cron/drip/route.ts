import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKstDaysSinceLaunch, getKstHour } from '@/lib/date';
import { NICHE_CODES, type NicheCode } from '@/lib/niches';

// 시드 콘텐츠 드립(Drip-feed) 발행 크론 (5주차, 2026-07-25).
// 콜드스타트 전략: 런칭 초반엔 화력을 집중해 "활성화된 서비스" 인상을 주고(Phase 1),
// 실유저 콘텐츠가 자리 잡으면 점점 발행량을 줄여(Phase 2 -> Phase 3) 자연스럽게 손을 뗀다.
// 15일차 이후에도 실유저 콘텐츠가 하루 목표치를 못 채운다면 그건 시드 부족이 아니라
// PMF/유입 채널 문제로 보고 시드를 더 늘리지 않는다는 게 팀 합의 사항(코드가 아닌 운영 판단
// 기준 — 5주차 KPI 측정과 함께 재검토).
//
// maxDuration 설정 불필요: Claude API 호출 없이 단순 DB read/insert/upsert만 수행(기본 10초로 충분).

const DEFAULT_LAUNCH_DATE = '2026-08-01';

function getDailyTotal(daysSinceLaunch: number): number {
  if (daysSinceLaunch <= 7) return 30; // Phase 1: 1~7일차
  if (daysSinceLaunch <= 14) return 10; // Phase 2: 8~14일차
  return 2; // Phase 3: 15일차~ (잔여 풀 소진 시까지 간헐적 유지)
}

// 시간대별 비중(KST) — 새벽엔 적고 취침 전(23시)에 가장 많음. vercel.json의 4개 크론 스케줄과
// 반드시 짝이 맞아야 함(둘 중 하나만 바뀌면 시간대 배분이 깨짐).
const HOURS = [8, 12, 18, 23];
const HOUR_WEIGHTS = [0.15, 0.2, 0.25, 0.4];

// 최대잉여법(Largest Remainder): 비중*합계를 슬롯별로 각각 Math.round하면 하루 합계가 목표치와
// 어긋날 수 있음(특히 Phase 3=2처럼 총량이 작을 때 반올림 오차의 영향이 큼) — floor 후 남는
// 잔여분을 소수부가 큰 슬롯부터 순서대로 배분해 항상 합계가 정확히 dailyTotal과 일치하게 한다.
function largestRemainderAllocate(total: number, weights: number[]): number[] {
  const raw = weights.map((w) => w * total);
  const floors = raw.map((v) => Math.floor(v));
  const remaining = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - floors[i] })).sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < remaining; k++) {
    result[order[k].i] += 1;
  }
  return result;
}

// 니치 3개에 최대한 균등 분배하고, 나눠떨어지지 않는 잔여분은 날짜/시간 기반 로테이션으로
// 배분한다 — 매번 같은 니치만 여분을 받지 않도록(장기적으로 공평하게).
function allocateEvenWithRotation(total: number, count: number, rotationOffset: number): number[] {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  const result = new Array(count).fill(base);
  for (let k = 0; k < remainder; k++) {
    result[(rotationOffset + k) % count] += 1;
  }
  return result;
}

// 정각 스케줄이 아닌 시점(수동 테스트 트리거 등)에 실행돼도 가장 가까운 시간대 슬롯을 골라
// 합리적으로 동작하게 함(0건 처리로 조용히 끝나지 않도록 하는 방어적 처리).
function findClosestHourIndex(currentHour: number): number {
  let closest = 0;
  let minDiff = Infinity;
  HOURS.forEach((h, i) => {
    const diff = Math.abs(h - currentHour);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  });
  return closest;
}

interface ClaimedSeed {
  id: string;
  content: string;
  image_url: string | null;
  seed_user_id: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const launchDate = process.env.LAUNCH_DATE || DEFAULT_LAUNCH_DATE;
  const daysSinceLaunch = getKstDaysSinceLaunch(launchDate);
  const dailyTotal = getDailyTotal(daysSinceLaunch);

  const currentHour = getKstHour();
  const hourAllocation = largestRemainderAllocate(dailyTotal, HOUR_WEIGHTS);
  const slotIndex = HOURS.includes(currentHour) ? HOURS.indexOf(currentHour) : findClosestHourIndex(currentHour);
  const slotTarget = hourAllocation[slotIndex];

  const nicheAllocation = allocateEvenWithRotation(
    slotTarget,
    NICHE_CODES.length,
    daysSinceLaunch + slotIndex // 날짜+슬롯 기준 로테이션 시드 — 별도 상태 저장 없이 매번 결정적으로 계산
  );

  let publishedCount = 0;

  for (let i = 0; i < NICHE_CODES.length; i++) {
    const niche = NICHE_CODES[i];
    const claimCount = nicheAllocation[i];
    if (claimCount <= 0) continue;

    const { data: claimed, error: claimError } = await supabase.rpc('claim_seed_contents', {
      target_niche: niche,
      claim_limit: claimCount,
    });

    if (claimError) {
      console.error(`시드 클레임 실패 (niche=${niche}):`, claimError.message);
      continue;
    }

    const claimedRows = (claimed ?? []) as ClaimedSeed[];
    if (claimedRows.length === 0) continue; // 이 니치 풀이 소진됨 — 에러 없이 조용히 스킵

    const rows = claimedRows.map((seed) => ({
      user_id: seed.seed_user_id,
      content: seed.content,
      image_url: seed.image_url,
      ai_niche: niche as NicheCode,
      status: 'success',
      is_spam: false,
      confidence: null,
      subtags: null,
      niche_hint_mismatch: null,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase.from('posts').insert(rows);
    if (insertError) {
      console.error(`시드 게시글 insert 실패 (niche=${niche}):`, insertError.message);
      continue;
    }

    publishedCount += rows.length;
  }

  // 매칭 프리뷰는 이번 클레임 여부와 무관하게 3개 니치 전체를 매번 갱신 — 오가닉 게시글도
  // 항상 최신 반영되도록(드립 발행 여부와 별개의 관심사). 유저 식별 정보는 절대 포함하지 않음.
  for (const niche of NICHE_CODES) {
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('content, image_url')
      .eq('ai_niche', niche)
      .eq('status', 'success')
      .eq('is_spam', false)
      .order('created_at', { ascending: false })
      .limit(5);

    const snapshot = (recentPosts ?? []).map((p) => ({ content: p.content, image_url: p.image_url }));

    await supabase
      .from('matching_previews')
      .upsert({ niche, preview_snapshot: snapshot, generated_at: new Date().toISOString() }, { onConflict: 'niche' });
  }

  return NextResponse.json({
    ok: true,
    daysSinceLaunch,
    dailyTotal,
    currentHour,
    slotTarget,
    nicheAllocation,
    published: publishedCount,
  });
}
