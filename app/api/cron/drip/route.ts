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

interface NewPost {
  id: string;
  user_id: string;
}

type ReactionType = 'cheer' | 'me_too';

const MIN_REACTORS = 3;
const MAX_REACTORS = 7;
const REACTION_TYPES: ReactionType[] = ['cheer', 'me_too'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 시드 페르소나 30명의 id 목록을 seed_contents_pool.seed_user_id에서 매번 동적으로 뽑아온다.
// UUID를 코드에 하드코딩하지 않는 이유: 나중에 페르소나가 추가/변경돼도 이 함수가 자동으로
// 최신 목록을 따라가게 하기 위함(400행 정도라 매 실행마다 다시 읽어도 비용은 무시할 만함).
async function getSeedPersonaIds(supabase: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const { data, error } = await supabase.from('seed_contents_pool').select('seed_user_id');
  if (error || !data) {
    console.error('시드 페르소나 ID 목록 조회 실패:', error?.message);
    return [];
  }
  return Array.from(new Set(data.map((row) => row.seed_user_id as string)));
}

// 이번 실행에서 새로 발행된 시드 게시글마다, 글쓴이 본인을 제외한 다른 시드 페르소나 중
// 3~7명을 무작위로 뽑아 반응(cheer/me_too) row를 만든다. 실제 오가닉 유저가 반응을 남길 때와
// 완전히 동일한 테이블 구조(post_id, user_id, reaction_type)를 그대로 사용하므로, 나중에 진짜
// 유저가 같은 글에 반응을 추가/취소해도 카운트 로직이 꼬일 일이 없다(전부 reactions 테이블의
// 실제 row 개수로 계산되는 구조라 시드/오가닉 구분 없이 동일하게 동작 — app/feed/[niche]/page.tsx
// 참고). 루프 안에서 매번 insert하지 않고 전체를 모아 마지막에 1회 bulk insert한다.
function buildReactionRows(
  newPosts: NewPost[],
  seedPersonaIds: string[]
): { post_id: string; user_id: string; reaction_type: ReactionType }[] {
  const rows: { post_id: string; user_id: string; reaction_type: ReactionType }[] = [];

  for (const post of newPosts) {
    const candidates = seedPersonaIds.filter((id) => id !== post.user_id); // 본인 글 자기반응 방지
    if (candidates.length === 0) continue;

    const reactorCount = Math.min(
      candidates.length,
      MIN_REACTORS + Math.floor(Math.random() * (MAX_REACTORS - MIN_REACTORS + 1))
    );
    const reactors = shuffle(candidates).slice(0, reactorCount);

    for (const reactorId of reactors) {
      const reactionType = REACTION_TYPES[Math.floor(Math.random() * REACTION_TYPES.length)];
      rows.push({ post_id: post.id, user_id: reactorId, reaction_type: reactionType });
    }
  }

  return rows;
}

// 니치별 "남은 미발행 풀 개수"를 조회한다(2026-07-26, 잔여 풀 비례 배분으로 리팩터링).
// 풀 규모가 최대 수백 개 수준이라 니치별로 3번 나눠 세는 대신, published_at이 null인 행의
// niche 컬럼만 한 번에 가져와 JS에서 집계하는 쪽이 왕복 횟수가 적어 더 간단하다.
async function getRemainingCounts(
  supabase: ReturnType<typeof createAdminClient>,
  niches: readonly NicheCode[]
): Promise<number[]> {
  const { data, error } = await supabase.from('seed_contents_pool').select('niche').is('published_at', null);

  if (error) {
    console.error('잔여 시드 풀 조회 실패:', error.message);
    return niches.map(() => 0);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.niche, (counts.get(row.niche) ?? 0) + 1);
  }

  return niches.map((niche) => counts.get(niche) ?? 0);
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

  // 2026-07-26 리팩터링: 니치 균등 분배(+로테이션)를 "잔여 풀 비례 동적 배분"으로 교체.
  // 니치별로 확보된 시드 콘텐츠 양이 처음부터 다르게 설계돼 있어(예: 홧김비용방어 60% vs
  // 눈팅러 6.7%), 균등 분배로는 물량이 적은 니치의 풀이 다른 니치보다 훨씬 먼저 바닥나버림.
  // 잔여 개수 비율 그대로 나누면 모든 니치가 항상 자기 몫에 비례해서 줄어들어, 세 니치가
  // 거의 동시에 소진된다(어느 한쪽만 먼저 텅 비는 일이 없음).
  const remainingCounts = await getRemainingCounts(supabase, NICHE_CODES);
  const totalRemaining = remainingCounts.reduce((a, b) => a + b, 0);

  let nicheAllocation: number[];
  if (totalRemaining === 0) {
    // 전체 풀 소진 — 비중 계산 자체가 0/0이 되므로 명시적으로 전부 0 처리하고 스킵
    nicheAllocation = NICHE_CODES.map(() => 0);
  } else {
    // slotTarget이 실제 남은 총량보다 크면 그만큼만 배분(가용 범위 내로 클램프).
    // 이 클램프 덕분에 최대잉여법이 어떤 니치에도 자기 잔여 개수를 초과해 할당하지 않는다는
    // 게 수학적으로 보장됨(비중의 합이 1이고 total <= totalRemaining이면, 반올림으로 +1되는
    // 경우까지 포함해도 결과가 항상 그 니치의 실제 잔여 개수 이내로 떨어짐) — 그래서 니치별로
    // "혹시 잔여보다 많이 요청하면" 같은 별도 방어 코드가 필요 없다.
    const claimTotal = Math.min(slotTarget, totalRemaining);
    const nicheWeights = remainingCounts.map((count) => count / totalRemaining);
    nicheAllocation = largestRemainderAllocate(claimTotal, nicheWeights);
  }

  let publishedCount = 0;
  const newlyPublishedPosts: NewPost[] = [];

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

    const { data: insertedPosts, error: insertError } = await supabase.from('posts').insert(rows).select('id, user_id');
    if (insertError) {
      console.error(`시드 게시글 insert 실패 (niche=${niche}):`, insertError.message);
      continue;
    }

    publishedCount += rows.length;
    newlyPublishedPosts.push(...((insertedPosts ?? []) as NewPost[]));
  }

  // 2026-07-26 (시드 반응 자동 생성): 이번 실행에서 새로 발행된 게시글마다 다른 시드 페르소나
  // 3~7명이 반응을 남긴 것처럼 reactions에 실제 row를 채워 넣는다. UI 카운트는 이 테이블의 row
  // 개수로 계산되므로(하드코딩된 숫자가 아님) 나중에 실유저 반응이 섞여도 정합성 문제가 없고,
  // "OOO님 외 N명" 같은 향후 기능이나 협업 필터링용 유저-게시글 관계 데이터로도 그대로 쓸 수 있다.
  let reactionCount = 0;
  if (newlyPublishedPosts.length > 0) {
    const seedPersonaIds = await getSeedPersonaIds(supabase);
    const reactionRows = buildReactionRows(newlyPublishedPosts, seedPersonaIds);

    if (reactionRows.length > 0) {
      const { error: reactionError } = await supabase.from('reactions').insert(reactionRows);
      if (reactionError) {
        console.error('시드 반응 insert 실패:', reactionError.message);
      } else {
        reactionCount = reactionRows.length;
      }
    }
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
    remainingCounts,
    nicheAllocation,
    published: publishedCount,
    reactionsGenerated: reactionCount,
  });
}
