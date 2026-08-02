import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKstDaysSinceLaunch, getKstHour, getTodayKst } from '@/lib/date';

// 시드 콘텐츠 드립 크론 (기획서 §8-3항 "시드 콘텐츠 고지·면책" 대응, 이용약관 제8조 3항).
//
// 2026-08-02 (v2 재설계): 24개짜리 단순 pool을 v1과 동일한 "런칭 이후 경과일 기준 테이퍼링 +
// 잔여 풀 비례 배분 + 시간대별 발행 비중" 로직으로 되돌리고, 니치(3개) 대신 룸(6개) 기준으로
// 옮겼다. 사용자가 v1과 동일한 총 400개 콘텐츠(약 2개월 지속)를 다시 준비하기로 했기 때문에
// 페이스도 v1과 동일하게(30→10→2/일) 되돌림 — 이전에 "룸이 6개뿐이라 하루 30개면 룸당 5개까지
// 몰릴 수 있다"고 캡 축소를 제안했었지만, 사용자가 "이전처럼 약 2개월" 유지를 명시적으로
// 선택해 원래 페이스로 복원함.
//
// 추가된 기능(v1엔 없었음): 새로 게시되는 글마다 ①다른 시드 페르소나들의 업/다운보트,
// ②짧은 시드 댓글(일부는 대댓글, 일부는 베스트 댓글 고정 임계치(+10)를 넘기게, 일부는 다운보트
// 접힘 임계치(-5)를 넘기게)를 자동 생성한다. v1의 "reactions"(단순 호감 표시)와 달리 v2는
// 핫스코어 정렬·베스트 댓글 고정·접힘 UI가 실제로 투표 수에 반응하는 기능이라, 시드 글이 계속
// 0표로 남아있으면 이 기능들이 의미 없어 보이는 문제를 해결하기 위함.
//
// 런칭일 분리(2026-08-02 QA 단계 요구사항): 아직 회귀 테스트/QA가 끝나지 않았으므로, 이 크론은
// 환경변수 SEED_DRIP_LAUNCH_DATE가 설정되기 전까지 아무 것도 하지 않고 조용히 종료한다.
// vercel.json에 크론 스케줄(4개 시간대)이 등록돼 있어도 안전 — 실제 발행은 이 값을 Vercel
// 환경변수에 추가하는 순간부터 "1일차"로 카운트되어 시작된다.
//
// maxDuration=60(Hobby 플랜 최대치) 명시: Phase 1(1~7일차) 피크 슬롯(23시, 가중치 40%)에는
// 한 번의 실행에서 최대 12개 게시글을 처리할 수 있는데, 게시글마다 투표 insert 1회 +
// 댓글 2~5개(댓글마다 insert 1회 + 투표 insert 1회)가 순차 실행돼 왕복 횟수가 커진다.
// v1은 이 정도 볼륨이 없어 기본 10초로 충분했지만(주석 참고용으로 남겨둔 이전 판단), v2는
// 안전하게 상한을 명시해둔다.
export const maxDuration = 60;

const HOURS = [8, 12, 18, 23];
const HOUR_WEIGHTS = [0.15, 0.2, 0.25, 0.4];

function getDailyTotal(daysSinceLaunch: number): number {
  if (daysSinceLaunch <= 7) return 30; // Phase 1: 1~7일차
  if (daysSinceLaunch <= 14) return 10; // Phase 2: 8~14일차
  return 2; // Phase 3: 15일차~ (잔여 풀 소진 시까지 간헐적 유지)
}

// 최대잉여법(Largest Remainder) — floor 후 남는 잔여분을 소수부가 큰 슬롯부터 배분해
// 합계가 항상 total과 정확히 일치하게 한다(v1과 동일 로직).
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

// 정각 스케줄이 아닌 시점(수동 테스트 트리거 등)에 실행돼도 가장 가까운 시간대 슬롯을 고른다.
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------------------------------
// 시드 댓글 뱅크 — 재사용 가능한 짧은 반응형 댓글 풀. 4개 "1클릭 찬반" 플레어
// (buy_or_not/should_i_buy/job_change/room_suggestion)는 찬성/반대 톤이 뚜렷해야 자연스러워서
// 별도 뱅크를 쓰고, 나머지 20개 플레어는 범용 뱅크를 공유한다.
// ------------------------------------------------------------
const GENERIC_COMMENTS = [
  '이거 완전 저예요 ㅋㅋㅋ',
  '오 진짜 꿀팁이네요 저장했습니다',
  '저도 오늘부터 따라해볼게요',
  '와... 이 정도면 진짜 짠테크 고수시네요',
  '공감 100번 누르고 싶어요',
  '저는 반대로 이번 달 완전 망했는데 반성하고 갑니다',
  '이 방법 저도 써봤는데 진짜 효과 있어요',
  '숫자로 보니까 더 와닿네요',
  '이런 글 진짜 좋아요 더 올려주세요',
  '저만 이런 거 아니었네요 위로받고 갑니다',
  '다음 달엔 저도 이렇게 해봐야겠어요',
  '이거 보고 바로 앱 깔았습니다',
  '진짜 현실적인 조언이네요',
  '저장 완료... 나중에 또 볼게요',
  '이 정도면 상위 1%인 듯',
  '저희 집도 이거 하는데 확실히 도움 되더라구요',
  '오늘 처음 알았어요 감사합니다',
  '이거 어디서 하는 거예요? 저도 해보고 싶어요',
  '역시 짠메이트 정보력 甲',
  '저도 비슷한 경험 있어서 격하게 공감합니다',
  '이런 글 볼 때마다 반성하게 되네요',
  '꾸준함이 진짜 답인 것 같아요',
  '저도 오늘 지출 줄여야겠다는 다짐하고 갑니다',
  '이거 진짜 실천하기 어려운데 대단하시네요',
  '글 잘 읽었습니다 저도 참고할게요',
  '이 조합 진짜 신박하네요',
  '저는 이거 안 해봤는데 한번 해봐야겠어요',
  '역시 사람 사는 거 다 똑같네요 ㅋㅋ',
  '돈 모으는 재미가 이런 거군요',
  '오늘도 하나 배워갑니다',
  '이거 저장 안 하면 나중에 후회할 듯',
  '진짜 웃프네요... 남 일 같지 않아요',
  '이 글 보고 왠지 힘이 나네요',
  '저도 비슷한 시기 겪고 있어서 눈이 가네요',
  '이야 이건 진짜 몰랐던 정보다',
  '갓생 사시네요 존경합니다',
  '저는 아직 멀었네요 반성...',
  '이 정도 절약이면 진짜 대단한 거예요',
  '한 줄 요약 감사합니다 이해 잘 됐어요',
  '이거 캡처해서 저장해둘게요',
  '오늘 하루 중 제일 유익한 글이었어요',
  '저도 다음 달부터 이거 시도해보려구요',
  '와 이건 진짜 실화냐...',
  '읽으면서 계속 고개 끄덕였어요',
  '이 조언 진짜 도움 됐습니다',
];

const DECISION_COMMENTS: Record<string, { favor: string[]; against: string[] }> = {
  buy_or_not: {
    favor: [
      '이 정도면 사도 될 것 같아요! 스트레스 관리도 중요하죠',
      '고민할 시간에 그냥 지르세요 ㅋㅋ',
      '필요한 거면 사는 게 맞다고 봐요',
      '저라면 삽니다, 오래 쓸 거잖아요',
      '요즘 세일 기간이면 지금이 기회예요',
      '자취템은 있으면 삶의 질이 확 달라져요',
    ],
    against: [
      '이번 달만 좀 참아보시는 건 어때요',
      '월급날까지만 버텨보세요 며칠 안 남았잖아요',
      '3일만 더 고민해보고 결정하세요',
      '지금은 좀 아닌 것 같아요, 급한 건 아니잖아요',
      '없어도 그동안 잘 살아오셨잖아요 ㅎㅎ',
      '중고로 먼저 알아보시는 건 어떨까요',
    ],
  },
  should_i_buy: {
    favor: [
      '이 정도 지출은 괜찮아요, 본인을 위한 소비도 필요해요',
      '스트레스 풀리면 그게 남는 거죠',
      '한 번쯤은 사도 된다고 생각해요',
      '이 가격이면 합리적인 것 같은데요',
      '홧김이어도 필요했던 거면 산 거 후회 안 할 거예요',
    ],
    against: [
      '홧김비용은 나중에 꼭 후회하더라구요...',
      '장바구니에 며칠만 넣어두고 다시 보세요',
      '지금 감정이 좀 격해진 것 같아요, 진정하고 결정하세요',
      '이 돈이면 다른 데 더 요긴하게 쓸 수 있을 것 같아요',
      '참았다가 진짜 필요할 때 사는 게 낫지 않을까요',
    ],
  },
  job_change: {
    favor: [
      '연봉 인상 폭이 크면 옮기는 게 맞다고 봐요',
      '지금 아니면 이런 기회 다시 안 올 수도 있어요',
      '커리어 관점에서도 이직이 나을 것 같아요',
      '고민된다는 건 이미 마음이 반쯤 기운 거 아닐까요',
      '새로운 환경에서 배우는 것도 많을 거예요',
    ],
    against: [
      '지금 회사에 정 붙였으면 그것도 중요한 자산이에요',
      '적응 리스크도 무시 못해요, 신중하게 결정하세요',
      '연봉만 보고 옮기면 후회하는 경우도 많더라구요',
      '지금 팀/사람이 좋으면 쉽게 못 바꾸는 것도 이해돼요',
      '조금 더 알아보고 결정해도 늦지 않아요',
    ],
  },
  room_suggestion: {
    favor: [
      '오 좋은 제안이네요, 찬성이요!',
      '저도 딱 필요하다고 생각했어요',
      '있으면 훨씬 편할 것 같아요, 찬성',
      '이런 의견 내주셔서 감사해요 저도 동의합니다',
      '실제로 관련 글 많이 올라오는 것 같아서 필요해 보여요',
    ],
    against: [
      '지금 체계로도 충분한 것 같아요',
      '조금 더 지켜보고 결정해도 될 것 같아요',
      '세분화하면 오히려 헷갈릴 수도 있을 것 같아요',
      '아직은 이르지 않나 싶어요',
      '기존 플레어로도 커버 가능할 것 같은데요',
    ],
  },
};

interface PoolItem {
  id: string;
  room_id: string;
  flair_id: string;
  seed_user_id: string;
  title: string;
  body: string;
  one_line_question: string | null;
}

type Admin = ReturnType<typeof createAdminClient>;

async function getSeedPersonaIds(admin: Admin): Promise<string[]> {
  const { data, error } = await admin.from('seed_contents_pool').select('seed_user_id');
  if (error || !data) return [];
  return Array.from(new Set(data.map((row) => row.seed_user_id as string)));
}

async function getRemainingCountsByRoom(admin: Admin, roomIds: string[]): Promise<number[]> {
  const { data, error } = await admin.from('seed_contents_pool').select('room_id').is('posted_at', null);
  if (error || !data) return roomIds.map(() => 0);
  const counts = new Map<string, number>();
  for (const row of data) counts.set(row.room_id, (counts.get(row.room_id) ?? 0) + 1);
  return roomIds.map((id) => counts.get(id) ?? 0);
}

// 새로 게시된 글에 다른 시드 페르소나들의 업/다운보트를 생성한다(80% 확률로 업보트 — 시드
// 콘텐츠는 대체로 무난하게 받아들여지는 톤으로 쓰였다는 전제). 핫스코어 정렬이 의미 있게
// 작동하도록 하는 게 목적.
const MIN_POST_VOTERS = 4;
const MAX_POST_VOTERS = 14;
const POST_UPVOTE_CHANCE = 0.8;

async function castPostVotes(admin: Admin, postId: string, authorId: string, personaIds: string[]): Promise<number> {
  const candidates = personaIds.filter((id) => id !== authorId);
  if (candidates.length === 0) return 0;
  const voterCount = Math.min(
    candidates.length,
    MIN_POST_VOTERS + Math.floor(Math.random() * (MAX_POST_VOTERS - MIN_POST_VOTERS + 1))
  );
  const voters = shuffle(candidates).slice(0, voterCount);
  const rows = voters.map((uid) => ({
    target_type: 'post' as const,
    target_id: postId,
    user_id: uid,
    value: (Math.random() < POST_UPVOTE_CHANCE ? 1 : -1) as 1 | -1,
  }));
  const { error } = await admin.from('votes').insert(rows);
  if (error) {
    console.error('시드 게시글 투표 insert 실패:', error.message);
    return 0;
  }
  return rows.length;
}

interface VoteRange {
  upMin: number;
  upMax: number;
  downMin: number;
  downMax: number;
}

async function castCommentVotes(admin: Admin, commentId: string, voterCandidates: string[], range: VoteRange) {
  const upCount = range.upMin + Math.floor(Math.random() * (range.upMax - range.upMin + 1));
  const downCount = range.downMin + Math.floor(Math.random() * (range.downMax - range.downMin + 1));
  const total = upCount + downCount;
  if (total === 0 || voterCandidates.length === 0) return;
  const voters = shuffle(voterCandidates).slice(0, Math.min(total, voterCandidates.length));
  const rows = voters.map((uid, idx) => ({
    target_type: 'comment' as const,
    target_id: commentId,
    user_id: uid,
    value: (idx < upCount ? 1 : -1) as 1 | -1,
  }));
  const { error } = await admin.from('votes').insert(rows);
  if (error) console.error('시드 댓글 투표 insert 실패:', error.message);
}

const MIN_COMMENTS = 2;
const MAX_COMMENTS = 5;
const REPLY_CHANCE = 0.4; // 최상위 댓글이 하나 있으면 이후 댓글이 그 대댓글이 될 확률
const BEST_BOOST_CHANCE = 0.35; // 댓글 중 하나를 베스트 고정 임계치(+10) 이상으로 밀어줄 확률
const COLLAPSE_CHANCE = 0.15; // 댓글 중 하나를 접힘 임계치(-5) 이하로 밀어줄 확률

// 시드 댓글 1건 insert. generateComments의 for 루프 안에서 직접 await 체인을 쓰면 루프 스코프의
// let 변수(topLevelId 등)와 얽혀 TS7022(자기 자신을 참조하는 순환 타입 추론) 오류가 나서
// 별도 함수로 분리함 — 반환 타입을 명시적으로 선언해두면 호출부에서 추론이 깔끔해진다.
async function insertSeedComment(
  admin: Admin,
  postId: string,
  parentCommentId: string | null,
  commenterId: string,
  text: string
): Promise<{ id: string; user_id: string } | null> {
  const result = await admin
    .from('comments')
    .insert({
      post_id: postId,
      parent_comment_id: parentCommentId,
      user_id: commenterId,
      body: text,
    })
    .select('id, user_id')
    .single();

  if (result.error || !result.data) {
    console.error('시드 댓글 insert 실패:', result.error?.message);
    return null;
  }
  return result.data as { id: string; user_id: string };
}

// 새로 게시된 글마다 2~5개의 시드 댓글을 만든다. 일부는 대댓글(1-Depth), 일부는 베스트 댓글
// 고정 임계치를 넘기게, 일부는 다운보트 접힘 임계치를 넘기게 투표를 몰아줘서 두 UI 기능이
// 실제로 눈에 보이게 한다.
async function generateComments(
  admin: Admin,
  postId: string,
  authorId: string,
  decisionFlairCode: string | null,
  personaIds: string[]
): Promise<number> {
  const candidates = personaIds.filter((id) => id !== authorId);
  if (candidates.length === 0) return 0;

  const bank = decisionFlairCode ? DECISION_COMMENTS[decisionFlairCode] : null;
  const pool = bank ? [...bank.favor, ...bank.against] : GENERIC_COMMENTS;

  const commentCount = MIN_COMMENTS + Math.floor(Math.random() * (MAX_COMMENTS - MIN_COMMENTS + 1));
  const usedTexts = new Set<string>();
  const created: { id: string; user_id: string }[] = [];
  let topLevelId: string | null = null;

  for (let i = 0; i < commentCount; i++) {
    const commenterId = shuffle(candidates)[0];
    let text = pool[Math.floor(Math.random() * pool.length)];
    let attempts = 0;
    while (usedTexts.has(text) && attempts < 5) {
      text = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    }
    usedTexts.add(text);

    const isReply: boolean = topLevelId !== null && Math.random() < REPLY_CHANCE;
    const parentCommentId: string | null = isReply ? topLevelId : null;

    const newComment = await insertSeedComment(admin, postId, parentCommentId, commenterId, text);
    if (!newComment) continue;

    created.push(newComment);
    if (!topLevelId && !isReply) topLevelId = newComment.id;
  }

  if (created.length === 0) return 0;

  const roles: ('normal' | 'best' | 'collapsed')[] = created.map(() => 'normal');
  if (Math.random() < BEST_BOOST_CHANCE) {
    roles[Math.floor(Math.random() * created.length)] = 'best';
  }
  if (created.length >= 2 && Math.random() < COLLAPSE_CHANCE) {
    let idx = Math.floor(Math.random() * created.length);
    while (roles[idx] === 'best') idx = Math.floor(Math.random() * created.length);
    roles[idx] = 'collapsed';
  }

  for (let i = 0; i < created.length; i++) {
    const c = created[i];
    const voterCandidates = candidates.filter((id) => id !== c.user_id);
    const range: VoteRange =
      roles[i] === 'best'
        ? { upMin: 10, upMax: 16, downMin: 0, downMax: 2 }
        : roles[i] === 'collapsed'
          ? { upMin: 0, upMax: 2, downMin: 5, downMax: 9 }
          : { upMin: 0, upMax: 8, downMin: 0, downMax: 3 };
    await castCommentVotes(admin, c.id, voterCandidates, range);
  }

  return created.length;
}

export async function GET() {
  const admin = createAdminClient();

  const launchDate = process.env.SEED_DRIP_LAUNCH_DATE;
  if (!launchDate) {
    return NextResponse.json({ skipped: true, reason: '런칭일(SEED_DRIP_LAUNCH_DATE) 미설정 — 드립 대기 중' });
  }

  // getKstDaysSinceLaunch는 "아직 런칭 전이어도 1일차로 clamp"하도록 만들어져 있다(v1 설계 —
  // 배포 직후 수동 테스트 트리거에서 Phase 1을 미리 볼 수 있게 하려는 의도). 그런데 이번엔
  // SEED_DRIP_LAUNCH_DATE를 미래 날짜(예: 2026-09-05)로 미리 등록해두고 그 전까지는 크론이
  // 스케줄대로 돌아도 아무 것도 하지 않길 원하므로, clamp에 기대지 않고 오늘 날짜와 런칭일을
  // 문자열로 직접 비교해 명시적으로 막는다('YYYY-MM-DD' 포맷은 사전식 비교가 곧 날짜 비교와
  // 같아 별도 파싱 없이 안전하게 비교 가능).
  const todayKst = getTodayKst();
  if (todayKst < launchDate) {
    return NextResponse.json({ skipped: true, reason: `런칭일(${launchDate}) 이전 — 대기 중`, todayKst });
  }

  const daysSinceLaunch = getKstDaysSinceLaunch(launchDate);
  const dailyTotal = getDailyTotal(daysSinceLaunch);
  const currentHour = getKstHour();
  const hourAllocation = largestRemainderAllocate(dailyTotal, HOUR_WEIGHTS);
  const slotIndex = HOURS.includes(currentHour) ? HOURS.indexOf(currentHour) : findClosestHourIndex(currentHour);
  const slotTarget = hourAllocation[slotIndex];

  if (slotTarget <= 0) {
    return NextResponse.json({ posted: 0, reason: '이 시간대 배분량 0', daysSinceLaunch, dailyTotal });
  }

  const { data: roomsList } = await admin.from('rooms').select('id');
  const roomIds = (roomsList ?? []).map((r) => r.id as string);

  const remainingCounts = await getRemainingCountsByRoom(admin, roomIds);
  const totalRemaining = remainingCounts.reduce((a, b) => a + b, 0);

  if (totalRemaining === 0) {
    return NextResponse.json({ posted: 0, reason: '풀 소진 — 게시할 시드 콘텐츠가 더 없음' });
  }

  const claimTotal = Math.min(slotTarget, totalRemaining);
  const roomWeights = remainingCounts.map((count) => count / totalRemaining);
  const roomAllocation = largestRemainderAllocate(claimTotal, roomWeights);

  const { data: decisionFlairs } = await admin
    .from('post_flairs')
    .select('id, code')
    .in('code', Object.keys(DECISION_COMMENTS));
  const decisionFlairMap = new Map((decisionFlairs ?? []).map((f) => [f.id as string, f.code as string]));

  const seedPersonaIds = await getSeedPersonaIds(admin);

  let publishedCount = 0;
  let voteCount = 0;
  let commentCount = 0;

  for (let i = 0; i < roomIds.length; i++) {
    const claimCount = roomAllocation[i];
    if (claimCount <= 0) continue;
    const roomId = roomIds[i];

    // claim_seed_pool_items()는 "미발행 항목 조회 → posted_at 갱신"을 UPDATE ... FOR UPDATE
    // SKIP LOCKED 한 문장으로 원자적으로 처리하는 Postgres 함수(2026-08-02 라이브 테스트 중
    // 동시 요청 2건이 같은 풀 항목을 중복 발행하는 버그를 발견해 추가 — 기존엔 SELECT로 조회한
    // 뒤 별도 UPDATE로 posted_at을 표시하는 두 단계 방식이라 그 사이에 다른 요청이 끼어들 수
    // 있었음). 정상 운영에서는 Vercel 크론이 정시에 1회만 실행되므로 거의 발생하지 않지만,
    // 수동 중복 트리거나 재시도 상황에서도 안전하도록 방어함.
    const { data: claimed, error: claimError } = await admin.rpc('claim_seed_pool_items', {
      p_room_id: roomId,
      p_limit: claimCount,
    });

    if (claimError || !claimed || claimed.length === 0) {
      if (claimError) console.error(`시드 풀 클레임 실패 (room=${roomId}):`, claimError.message);
      continue;
    }

    for (const item of claimed as PoolItem[]) {
      const { data: inserted, error: insertError } = await admin
        .from('posts')
        .insert({
          user_id: item.seed_user_id,
          room_id: item.room_id,
          flair_id: item.flair_id,
          title: item.title,
          body: item.body,
          one_line_question: item.one_line_question,
        })
        .select('id, user_id, flair_id')
        .single();

      if (insertError || !inserted) {
        console.error(`시드 게시 실패 (pool id=${item.id}):`, insertError?.message);
        continue;
      }

      publishedCount += 1;

      voteCount += await castPostVotes(admin, inserted.id, inserted.user_id, seedPersonaIds);

      const decisionCode = decisionFlairMap.get(inserted.flair_id) ?? null;
      commentCount += await generateComments(admin, inserted.id, inserted.user_id, decisionCode, seedPersonaIds);
    }
  }

  return NextResponse.json({
    daysSinceLaunch,
    dailyTotal,
    currentHour,
    slotTarget,
    remainingCounts,
    roomAllocation,
    published: publishedCount,
    votesGenerated: voteCount,
    commentsGenerated: commentCount,
  });
}
