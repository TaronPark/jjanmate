'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 댓글 작성. parentCommentId는 항상 "최상위 원댓글"의 id만 받는다(1-Depth 강제) — 대댓글의
// 대댓글을 다는 경우에도 클라이언트가 원댓글 id로 정규화해서 넘기고, mentionedNickname으로
// 직접 답한 대상의 닉네임을 @멘션 표기용으로 함께 저장한다(기획서 4-1).
export async function createComment(
  postId: string,
  body: string,
  parentCommentId: string | null,
  mentionedNickname: string | null
): Promise<{ error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { error: '댓글 내용을 입력해주세요.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    parent_comment_id: parentCommentId,
    user_id: user.id,
    mentioned_nickname: mentionedNickname,
    body: trimmed,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/post/${postId}`);
  return { error: null };
}

// 글쓴이 1-Click 액션 (기획서 2-3): 투표형 플레어 4종 한정, 상태 변경은 1회만 가능(되돌리기 없음).
// posts UPDATE는 클라이언트 RLS 정책을 열어두지 않았으므로(향후 카운트 컬럼 변조 방지 목적),
// 여기서 소유권/중복 여부를 수동 검증한 뒤 service_role(admin) 클라이언트로 갱신한다.
export async function setAuthorAction(postId: string, value: 'a' | 'b'): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { data: post } = await supabase
    .from('posts')
    .select('user_id, author_action_value')
    .eq('id', postId)
    .single();

  if (!post) {
    return { error: '게시글을 찾을 수 없습니다.' };
  }
  if (post.user_id !== user.id) {
    return { error: '작성자만 상태를 변경할 수 있어요.' };
  }
  if (post.author_action_value) {
    return { error: '이미 상태가 변경되었어요.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('posts')
    .update({ author_action_value: value, author_action_completed_at: new Date().toISOString() })
    .eq('id', postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/post/${postId}`);
  return { error: null };
}
