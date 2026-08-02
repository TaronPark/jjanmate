'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { VoteTargetType } from '@/lib/types';

// 게시글/댓글 업다운보트 (기획서 2-6: 유저 투표 상태는 +1/0/-1 3가지로만 관리).
// select-then-insert/update/delete 방식:
// - 기존 투표 없음 -> insert
// - 같은 방향 재클릭 -> delete(취소, 0 상태로 복귀)
// - 반대 방향 클릭 -> update(반대 전환, Δ=±2)
// posts/comments의 upvote_count/downvote_count는 votes 테이블 트리거(sync_vote_counts)가
// 자동 갱신하므로 여기서는 votes 행만 다루면 된다.
export async function castVote(
  targetType: VoteTargetType,
  targetId: string,
  value: 1 | -1
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { data: existing } = await supabase
    .from('votes')
    .select('id, value')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('user_id', user.id)
    .maybeSingle();

  let error;
  if (!existing) {
    ({ error } = await supabase
      .from('votes')
      .insert({ target_type: targetType, target_id: targetId, user_id: user.id, value }));
  } else if (existing.value === value) {
    ({ error } = await supabase.from('votes').delete().eq('id', existing.id));
  } else {
    ({ error } = await supabase.from('votes').update({ value }).eq('id', existing.id));
  }

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'page');
  revalidatePath('/room/[code]', 'page');
  revalidatePath('/post/[id]', 'page');

  return { error: null };
}
