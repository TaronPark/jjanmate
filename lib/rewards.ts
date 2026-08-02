import { createClient } from '@/lib/supabase/server';

// "이달의 랭킹" (마이페이지 보상·명예 탭 기본 화면, 디자인 시안 화면 4 참고): monthly_badges는
// "지난 달 확정 스냅샷"만 담고 있어서(app/api/cron/monthly-badges), 진행 중인 이번 달의
// 실시간 순위를 보여줄 별도 테이블이 없다. 그래서 이번 달 KST 1일 00:00 이후 작성된
// 게시글+댓글의 순업보트 합을 매 요청마다 즉시 집계하는 라이브 랭킹으로 구현한다
// (posts/comments는 select 전체 공개라 세션 클라이언트로 다른 유저 데이터도 읽을 수 있음).
//
// 배지 정산(monthly_badges)은 룸별/전체 + 게시글/댓글 카테고리를 분리해서 산정하지만, 이
// "이달의 랭킹" 화면은 시안상 카테고리 구분 없는 단일 종합 순위이므로 게시글+댓글 순업보트를
// 합산한 값을 기준으로 한다 — monthly_badges 정산 로직과는 별개의 화면용 집계다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function currentMonthStartUtcIso(): string {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const startUtcMs = Date.UTC(y, m, 1, 0, 0, 0) - KST_OFFSET_MS;
  return new Date(startUtcMs).toISOString();
}

export interface RankEntry {
  user_id: string;
  nickname: string;
  user_flair: string | null;
  score: number;
  rank: number;
}

export interface LiveMonthlyRanking {
  top: RankEntry[];
  myEntry: RankEntry | null;
}

export async function getLiveMonthlyRanking(currentUserId: string, topN = 10): Promise<LiveMonthlyRanking> {
  const supabase = await createClient();
  const monthStart = currentMonthStartUtcIso();

  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase.from('posts').select('user_id, upvote_count, downvote_count').gte('created_at', monthStart).eq('is_deleted', false),
    supabase.from('comments').select('user_id, upvote_count, downvote_count').gte('created_at', monthStart).eq('is_deleted', false),
  ]);

  const scores = new Map<string, number>();
  for (const p of posts ?? []) {
    scores.set(p.user_id, (scores.get(p.user_id) ?? 0) + (p.upvote_count - p.downvote_count));
  }
  for (const c of comments ?? []) {
    scores.set(c.user_id, (scores.get(c.user_id) ?? 0) + (c.upvote_count - c.downvote_count));
  }

  const userIds = [...scores.keys()];
  if (userIds.length === 0) return { top: [], myEntry: null };

  const { data: profiles } = await supabase.from('profiles').select('id, nickname, user_flair').in('id', userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const ranked = userIds
    .map((uid) => ({
      user_id: uid,
      nickname: profileMap.get(uid)?.nickname ?? '탈퇴회원',
      user_flair: profileMap.get(uid)?.user_flair ?? null,
      score: scores.get(uid)!,
    }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const top = ranked.slice(0, topN);
  const myEntry = ranked.find((e) => e.user_id === currentUserId) ?? null;

  return { top, myEntry };
}
