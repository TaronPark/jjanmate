'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// 원클릭 공감 리액션 토글 (4주차, 2026-07-25). posts/nickname과 달리 이 액션은 특정 니치
// 라우트에 종속되지 않아 app/feed/[niche] 대신 app/feed 아래에 둠.
//
// select-then-insert/delete 방식: 이미 반응했는지 조회 후 있으면 삭제, 없으면 추가.
// reactions 테이블의 unique(post_id, user_id, reaction_type) 제약이 있어 동시 더블클릭 같은
// 극단적 race가 나도 DB가 중복 삽입 자체를 막아주므로 별도 락 처리는 넣지 않음(2026-07-25 합의).
//
// RLS: reactions_insert_own/reactions_delete_own이 이미 "본인 반응만" 허용하므로 이 액션은
// 일반 SSR(세션 기반) 클라이언트만으로 충분 — service_role 필요 없음(스트릭/AI 필드와 달리
// 리액션은 유저가 직접 통제해도 되는 데이터이기 때문).
export async function toggleReaction(
  postId: string,
  reactionType: 'cheer' | 'me_too'
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .eq('reaction_type', reactionType)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('reactions').delete().eq('id', existing.id)
    : await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, reaction_type: reactionType });

  if (error) {
    return { error: error.message };
  }

  // 동적 라우트 전체(모든 니치 피드) 캐시 갱신. 어떤 니치에서 눌렀는지 별도 조회 없이
  // 와일드카드로 처리 — 리액션은 조회 빈도에 비해 비용이 크지 않아 이 정도로 충분함.
  revalidatePath('/feed/[niche]', 'page');

  return { error: null };
}
