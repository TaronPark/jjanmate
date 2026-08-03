'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// 북마크 토글 (기획서 3-4: 1-Tap 즉시 토글, 전역 상태 동기화).
export async function toggleBookmark(postId: string): Promise<{ error: string | null; bookmarked: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.', bookmarked: false };
  }

  // 수정요청사항(2026-08-03, p.3): 본인 글은 본인이 북마크할 수 없다(마이페이지에서 바로 모아볼 수 있음).
  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).maybeSingle();
  if (post && post.user_id === user.id) {
    return { error: '본인 글은 북마크할 수 없어요.', bookmarked: false };
  }

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id);
    if (error) return { error: error.message, bookmarked: true };
    revalidatePath('/mypage');
    return { error: null, bookmarked: false };
  }

  const { error } = await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id });
  if (error) return { error: error.message, bookmarked: false };
  revalidatePath('/mypage');
  return { error: null, bookmarked: true };
}
