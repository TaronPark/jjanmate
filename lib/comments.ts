import { createClient } from '@/lib/supabase/server';
import type { Comment } from '@/lib/types';
import { rawHotScore } from './hotscore';

// 기획서 2-4: 순업보트(업-다운) 구간 → 뱃지 레벨. 3~4=Level1(공감), 5~9=Level2(핫댓글),
// 10 이상=Level3(베스트댓글) 후보 — 단, Level3 크라운+최상단고정은 게시글당 1개만 허용되므로
// 10 이상인데 최종 베스트로 뽑히지 못한 댓글은 아래 getPostComments에서 Level2로 강등한다.
function levelFromNet(net: number): 0 | 1 | 2 | 3 {
  if (net >= 10) return 3;
  if (net >= 5) return 2;
  if (net >= 3) return 1;
  return 0;
}

export interface MyComment extends Comment {
  post_title: string;
  room_code: string;
}

// 마이페이지 > 댓글 탭. 원글 제목 터치 시 해당 룸 피드 맥락으로 이동할 수 있도록 room_code도 함께 가져온다.
export async function getMyComments(userId: string): Promise<MyComment[]> {
  const supabase = await createClient();
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error || !comments || comments.length === 0) return [];

  const postIds = [...new Set(comments.map((c) => c.post_id))];
  const { data: posts } = await supabase.from('posts').select('id, title, room_id').in('id', postIds);
  const roomIds = [...new Set((posts ?? []).map((p) => p.room_id))];
  const { data: rooms } = await supabase.from('rooms').select('id, code').in('id', roomIds);

  const roomCodeMap = new Map((rooms ?? []).map((r) => [r.id, r.code]));
  const postMap = new Map((posts ?? []).map((p) => [p.id, { title: p.title, room_code: roomCodeMap.get(p.room_id) ?? '' }]));

  return comments.map((c) => ({
    ...c,
    post_title: postMap.get(c.post_id)?.title ?? '(삭제된 글)',
    room_code: postMap.get(c.post_id)?.room_code ?? '',
  }));
}

export interface CommentNode extends Comment {
  author_nickname: string;
  author_user_flair: string | null;
  my_vote: 1 | -1 | 0;
  replies: CommentNode[];
  is_best: boolean;
  is_collapsed: boolean;
  // 기획서 2-4: 댓글 순업보트 구간별 전면 뱃지(Level 0~3). Level 3은 is_best(게시글당 1개, 최고점
  // +10 이상)와 동일한 조건이라 별도 계산 없이 is_best를 그대로 반영한다.
  level: 0 | 1 | 2 | 3;
}

// 기획서 4장: 1-Depth 스레드 + 베스트 댓글 고정(+10 이상 최고점) + 다운보트 접힘(-5 이하,
// 하위 대댓글 연쇄 접힘) + 원댓글은 Raw Hot Score순, 대댓글은 최신순.
export async function getPostComments(postId: string, currentUserId: string | null): Promise<CommentNode[]> {
  const supabase = await createClient();
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (!comments || comments.length === 0) return [];

  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const commentIds = comments.map((c) => c.id);

  const [{ data: profiles }, voteResult] = await Promise.all([
    supabase.from('profiles').select('id, nickname, user_flair').in('id', userIds),
    currentUserId
      ? supabase
          .from('votes')
          .select('target_id, value')
          .eq('user_id', currentUserId)
          .eq('target_type', 'comment')
          .in('target_id', commentIds)
      : Promise.resolve({ data: [] as { target_id: string; value: number }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const myVoteMap = new Map((voteResult.data ?? []).map((v) => [v.target_id, v.value as 1 | -1]));

  const nodes = new Map<string, CommentNode>();
  for (const c of comments) {
    const profile = profileMap.get(c.user_id);
    nodes.set(c.id, {
      ...c,
      author_nickname: profile?.nickname ?? '알 수 없음',
      author_user_flair: profile?.user_flair ?? null,
      my_vote: myVoteMap.get(c.id) ?? 0,
      replies: [],
      is_best: false,
      is_collapsed: c.upvote_count - c.downvote_count <= -5,
      level: levelFromNet(c.upvote_count - c.downvote_count),
    });
  }

  const topLevel: CommentNode[] = [];
  for (const c of comments) {
    const node = nodes.get(c.id)!;
    if (c.parent_comment_id) {
      const parent = nodes.get(c.parent_comment_id);
      if (parent) {
        parent.replies.push(node);
        if (parent.is_collapsed) node.is_collapsed = true;
      } else {
        topLevel.push(node);
      }
    } else {
      topLevel.push(node);
    }
  }

  let best: CommentNode | null = null;
  for (const node of topLevel) {
    const net = node.upvote_count - node.downvote_count;
    if (net >= 10 && (!best || net > best.upvote_count - best.downvote_count)) {
      best = node;
    }
  }
  if (best) best.is_best = true;
  // 크라운(Level 3)+최상단고정은 게시글당 1개만 — 대댓글 포함 전체 노드 대상으로 강등 처리.
  for (const node of nodes.values()) {
    if (node.level === 3 && node !== best) node.level = 2;
  }

  const now = Date.now();
  topLevel.sort((a, b) => {
    if (a.is_best) return -1;
    if (b.is_best) return 1;
    return (
      rawHotScore(b.upvote_count, b.downvote_count, b.created_at, now) -
      rawHotScore(a.upvote_count, a.downvote_count, a.created_at, now)
    );
  });

  // 수정요청사항(2026-08-05, p.3): 답글이 최신순(내림차순)이면 "답글에 다시 답글 → @멘션" 흐름에서
  // 나중에 단 답글이 위로 올라가 대화가 거꾸로 읽힌다. 오래된순(작성 순서)으로 바꿔 위→아래로
  // 읽을 때 멘션 대상이 항상 먼저 나오도록 한다.
  for (const node of topLevel) {
    node.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  return topLevel;
}
