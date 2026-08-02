import { createClient } from '@/lib/supabase/server';
import { getRoomById, getFlairById } from '@/lib/rooms';
import type { Post, FeedPost } from '@/lib/types';

// posts.rpc(get_popular_feed / get_room_feed)로 정렬까지 끝난 원본 행을 받아, 화면에 필요한
// 조인 데이터(룸/플레어/작성자/북마크여부/베스트댓글/내 투표상태)를 붙여 FeedPost로 만든다.
// Supabase JS는 커스텀 SQL 함수(핫스코어 정렬)의 결과에 임베디드 조인을 못 붙이므로
// 2단계(정렬된 id 목록 -> 배치 조회)로 처리한다.
async function hydratePosts(posts: Post[], currentUserId: string | null): Promise<FeedPost[]> {
  if (posts.length === 0) return [];
  const supabase = await createClient();
  const postIds = posts.map((p) => p.id);
  const userIds = [...new Set(posts.map((p) => p.user_id))];

  const [{ data: profiles }, bookmarkResult, voteResult, { data: comments }] = await Promise.all([
    supabase.from('profiles').select('id, nickname, user_flair').in('id', userIds),
    currentUserId
      ? supabase.from('bookmarks').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    currentUserId
      ? supabase
          .from('votes')
          .select('target_id, value')
          .eq('user_id', currentUserId)
          .eq('target_type', 'post')
          .in('target_id', postIds)
      : Promise.resolve({ data: [] as { target_id: string; value: number }[] }),
    supabase
      .from('comments')
      .select('post_id, body, upvote_count, downvote_count')
      .in('post_id', postIds)
      .eq('is_deleted', false),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const bookmarkedSet = new Set((bookmarkResult.data ?? []).map((b) => b.post_id));
  const myVoteMap = new Map((voteResult.data ?? []).map((v) => [v.target_id, v.value as 1 | -1]));
  const bestCommentMap = new Map<string, { body: string; net_upvotes: number }>();
  for (const c of comments ?? []) {
    const net = c.upvote_count - c.downvote_count;
    const current = bestCommentMap.get(c.post_id);
    if (!current || net > current.net_upvotes) {
      bestCommentMap.set(c.post_id, { body: c.body, net_upvotes: net });
    }
  }

  const result: FeedPost[] = [];
  for (const post of posts) {
    const room = await getRoomById(post.room_id);
    const flair = await getFlairById(post.flair_id);
    if (!room || !flair) continue;
    const profile = profileMap.get(post.user_id);
    const best = bestCommentMap.get(post.id);
    result.push({
      ...post,
      room,
      flair,
      author_nickname: profile?.nickname ?? '알 수 없음',
      author_user_flair: profile?.user_flair ?? null,
      is_bookmarked: bookmarkedSet.has(post.id),
      best_comment: best && best.net_upvotes > 0 ? best : null,
      my_vote: myVoteMap.get(post.id) ?? 0,
    });
  }
  return result;
}

export async function getPopularFeed(
  currentUserId: string | null,
  limit = 20,
  offset = 0
): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_popular_feed', { p_limit: limit, p_offset: offset });
  if (error) {
    console.error('인기 피드 조회 실패:', error.message);
    return [];
  }
  return hydratePosts((data ?? []) as Post[], currentUserId);
}

export async function getRoomFeed(
  roomId: string,
  flairId: string | null,
  sort: 'hot' | 'new',
  currentUserId: string | null,
  limit = 20,
  offset = 0
): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_room_feed', {
    p_room_id: roomId,
    p_flair_id: flairId,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error('룸 피드 조회 실패:', error.message);
    return [];
  }
  return hydratePosts((data ?? []) as Post[], currentUserId);
}

// 마이페이지 > 북마크 탭. 정렬은 "내가 북마크를 누른 최신순"(기획서 탭3) — posts.created_at이
// 아니라 bookmarks.created_at 기준으로 정렬해야 하므로 get_room_feed/get_popular_feed RPC를
// 쓰지 않고 별도로 조회한다.
export async function getBookmarkedPosts(userId: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select('post_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !bookmarks || bookmarks.length === 0) return [];

  const postIds = bookmarks.map((b) => b.post_id);
  const { data: posts } = await supabase.from('posts').select('*').in('id', postIds).eq('is_deleted', false);
  if (!posts) return [];

  const orderMap = new Map(postIds.map((id, idx) => [id, idx]));
  const ordered = [...posts].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return hydratePosts(ordered as Post[], userId);
}

// 마이페이지 > 게시글 탭. 본인 글 전체(최신순).
export async function getMyPosts(userId: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error || !posts) return [];
  return hydratePosts(posts as Post[], userId);
}

// 게시글 상세 화면용 단건 조회 — 피드와 동일한 조인 로직(hydratePosts)을 재사용해 룸/플레어/
// 작성자/북마크/내투표 상태를 일관되게 붙인다.
export async function getPostDetail(postId: string, currentUserId: string | null): Promise<FeedPost | null> {
  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error || !post) return null;

  const hydrated = await hydratePosts([post as Post], currentUserId);
  return hydrated[0] ?? null;
}
