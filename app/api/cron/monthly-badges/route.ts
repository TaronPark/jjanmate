import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTodayKst } from '@/lib/date';

// 월간 활동 보상 배치 (기획서 8장). 매월 1일 00:00(KST) 전월 실적을 스냅샷해 monthly_badges에
// 기록한다. Vercel Hobby 플랜은 cron 표현식에 "매월 1일 KST 자정" 같은 타임존 인식 스케줄을
// 직접 표현할 수 없어(cron은 UTC 기준), UTC 15:00에 매일 실행되도록 등록해두고(=KST 00:00),
// 함수 내부에서 오늘이 KST 기준 1일이 아니면 즉시 종료하는 방식으로 우회한다
// (lib/date.ts의 시드 콘텐츠 드립 크론에서 쓰던 것과 동일한 KST 처리 원칙).
//
// 집계 대상: 당월(전월) 1일 00:00:00 ~ 말일 23:59:59(KST) 사이에 "신규 작성된" 게시글/댓글이
// 그 기간 내 획득한 순업보트 합. 과거 글이 뒤늦게 포인트를 얻는 어부지리 집계는 원천 차단됨
// (created_at 범위로만 필터링하고, 그 시점 이후 누적된 upvote_count/downvote_count를 그대로
// 합산하기 때문 — 정산 시점의 최신 카운트를 쓰므로 정산일 직전까지의 투표가 모두 반영됨).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getPreviousMonthRangeUtc(): { yearMonth: string; startUtc: string; endUtc: string } {
  const todayKst = getTodayKst();
  const [y, m] = todayKst.split('-').map(Number);

  const prevMonthDate = new Date(Date.UTC(y, m - 1 - 1, 1));
  const prevY = prevMonthDate.getUTCFullYear();
  const prevM = prevMonthDate.getUTCMonth() + 1;
  const yearMonth = `${prevY}-${String(prevM).padStart(2, '0')}`;

  const startUtcMs = Date.UTC(prevY, prevM - 1, 1, 0, 0, 0) - KST_OFFSET_MS;
  const endUtcMs = Date.UTC(y, m - 1, 1, 0, 0, 0) - KST_OFFSET_MS;

  return { yearMonth, startUtc: new Date(startUtcMs).toISOString(), endUtc: new Date(endUtcMs).toISOString() };
}

interface RankEntry {
  user_id: string;
  score: number;
}

function topN(scoresByUser: Map<string, number>, n = 3): RankEntry[] {
  return [...scoresByUser.entries()]
    .map(([user_id, score]) => ({ user_id, score }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

type BadgeRow = {
  year_month: string;
  scope: 'room' | 'global';
  room_id: string | null;
  category: 'post' | 'comment';
  rank: 1 | 2 | 3;
  user_id: string;
  score: number;
};

export async function GET() {
  const todayKst = getTodayKst();
  if (!todayKst.endsWith('-01')) {
    return NextResponse.json({ skipped: true, reason: 'KST 기준 1일이 아님' });
  }

  const { yearMonth, startUtc, endUtc } = getPreviousMonthRangeUtc();
  const admin = createAdminClient();

  // 같은 날 크론이 재시도/중복 실행되더라도 monthly_badges가 중복 생성되지 않도록 방어
  // (scope='global'인 행은 room_id가 null이라 unique 제약만으로는 중복을 못 막기 때문에 필요).
  const { data: existing } = await admin.from('monthly_badges').select('id').eq('year_month', yearMonth).limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ skipped: true, reason: '이미 정산됨', yearMonth });
  }

  const [{ data: posts }, { data: comments }, { data: rooms }] = await Promise.all([
    admin
      .from('posts')
      .select('user_id, room_id, upvote_count, downvote_count')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc)
      .eq('is_deleted', false),
    admin
      .from('comments')
      .select('user_id, post_id, upvote_count, downvote_count')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc)
      .eq('is_deleted', false),
    admin.from('rooms').select('id'),
  ]);

  const commentPostIds = [...new Set((comments ?? []).map((c) => c.post_id))];
  const { data: commentPosts } =
    commentPostIds.length > 0
      ? await admin.from('posts').select('id, room_id').in('id', commentPostIds)
      : { data: [] as { id: string; room_id: string }[] };
  const postRoomMap = new Map((commentPosts ?? []).map((p) => [p.id, p.room_id]));

  const rows: BadgeRow[] = [];

  for (const room of rooms ?? []) {
    const postScores = new Map<string, number>();
    for (const p of posts ?? []) {
      if (p.room_id !== room.id) continue;
      postScores.set(p.user_id, (postScores.get(p.user_id) ?? 0) + (p.upvote_count - p.downvote_count));
    }
    topN(postScores).forEach((entry, idx) => {
      rows.push({
        year_month: yearMonth,
        scope: 'room',
        room_id: room.id,
        category: 'post',
        rank: (idx + 1) as 1 | 2 | 3,
        user_id: entry.user_id,
        score: entry.score,
      });
    });

    const commentScores = new Map<string, number>();
    for (const c of comments ?? []) {
      if (postRoomMap.get(c.post_id) !== room.id) continue;
      commentScores.set(c.user_id, (commentScores.get(c.user_id) ?? 0) + (c.upvote_count - c.downvote_count));
    }
    topN(commentScores).forEach((entry, idx) => {
      rows.push({
        year_month: yearMonth,
        scope: 'room',
        room_id: room.id,
        category: 'comment',
        rank: (idx + 1) as 1 | 2 | 3,
        user_id: entry.user_id,
        score: entry.score,
      });
    });
  }

  const globalPostScores = new Map<string, number>();
  for (const p of posts ?? []) {
    globalPostScores.set(p.user_id, (globalPostScores.get(p.user_id) ?? 0) + (p.upvote_count - p.downvote_count));
  }
  topN(globalPostScores).forEach((entry, idx) => {
    rows.push({
      year_month: yearMonth,
      scope: 'global',
      room_id: null,
      category: 'post',
      rank: (idx + 1) as 1 | 2 | 3,
      user_id: entry.user_id,
      score: entry.score,
    });
  });

  const globalCommentScores = new Map<string, number>();
  for (const c of comments ?? []) {
    globalCommentScores.set(c.user_id, (globalCommentScores.get(c.user_id) ?? 0) + (c.upvote_count - c.downvote_count));
  }
  topN(globalCommentScores).forEach((entry, idx) => {
    rows.push({
      year_month: yearMonth,
      scope: 'global',
      room_id: null,
      category: 'comment',
      rank: (idx + 1) as 1 | 2 | 3,
      user_id: entry.user_id,
      score: entry.score,
    });
  });

  if (rows.length > 0) {
    const { error } = await admin.from('monthly_badges').insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ yearMonth, badgesCreated: rows.length });
}
