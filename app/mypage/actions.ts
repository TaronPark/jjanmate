'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { containsBlacklistedWord } from '@/lib/blacklist';

// 유저 플레어 수정 (기획서 7-4): 최대 5자 + 블랙리스트 검증(부분문자열 + 정규화).
export async function updateUserFlair(flair: string): Promise<{ error: string | null }> {
  const trimmed = flair.trim();
  if (trimmed.length > 5) {
    return { error: '유저 플레어는 최대 5자까지 입력할 수 있어요.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  if (trimmed) {
    const blocked = await containsBlacklistedWord(trimmed);
    if (blocked) {
      return { error: '사용할 수 없는 단어가 포함되어 있습니다.' };
    }
  }

  const { error } = await supabase.from('profiles').update({ user_flair: trimmed || null }).eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/mypage');
  return { error: null };
}

// 마이페이지 > 게시글 탭 > 더보기(⋮) > 삭제. 소프트 삭제(is_deleted=true)로 처리해
// 댓글/투표 참조 무결성을 보존한다. posts UPDATE는 클라이언트 RLS를 열어두지 않았으므로
// 소유권을 수동 검증한 뒤 service_role(admin)로 갱신한다(app/post/[id]/actions.ts와 동일 패턴).
export async function deletePost(postId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
  if (!post) return { error: '게시글을 찾을 수 없습니다.' };
  if (post.user_id !== user.id) return { error: '본인 게시글만 삭제할 수 있어요.' };

  const admin = createAdminClient();
  const { error } = await admin.from('posts').update({ is_deleted: true }).eq('id', postId);
  if (error) return { error: error.message };

  revalidatePath('/mypage');
  revalidatePath('/', 'page');
  return { error: null };
}
