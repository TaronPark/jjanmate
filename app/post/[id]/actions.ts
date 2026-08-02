'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyIfEnabled, notifyManyIfEnabled } from '@/lib/notify';
import { getFlairById } from '@/lib/rooms';

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

  const { data: inserted, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      parent_comment_id: parentCommentId,
      user_id: user.id,
      mentioned_nickname: mentionedNickname,
      body: trimmed,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  // 알림: 대댓글이면 "원댓글 작성자"에게, 최상위 댓글이면 "게시글 작성자"에게 발송한다
  // (본인 글/댓글에 본인이 다는 경우는 제외). 조회 실패는 댓글 작성 자체를 막을 이유가 없으므로
  // 알림 발송 실패는 무시하고 넘어간다(베스트 에포트).
  const admin = createAdminClient();
  const { data: post } = await admin.from('posts').select('user_id, title').eq('id', postId).maybeSingle();

  if (parentCommentId) {
    const { data: parentComment } = await admin
      .from('comments')
      .select('user_id')
      .eq('id', parentCommentId)
      .maybeSingle();
    if (parentComment && parentComment.user_id !== user.id) {
      await notifyIfEnabled(parentComment.user_id, 'comment_reply', {
        kind: 'comment_reply',
        post_id: postId,
        post_title: post?.title ?? '',
        comment_id: inserted?.id ?? null,
      });
    }
  } else if (post && post.user_id !== user.id) {
    await notifyIfEnabled(post.user_id, 'comment_reply', {
      kind: 'post_comment',
      post_id: postId,
      post_title: post.title,
      comment_id: inserted?.id ?? null,
    });
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
    .select('user_id, flair_id, title, author_action_value')
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

  // 투표자 피드백 알림 (기획서: 1-Click 완료 시 해당 글에 투표했던 사람들에게 결과 통지).
  // 작성자 본인은 투표자 목록에 포함돼 있어도 알림 대상에서 제외한다.
  const flair = await getFlairById(post.flair_id);
  const actionLabel = (value === 'a' ? flair?.action_label_a : flair?.action_label_b) ?? null;

  const { data: voteRows } = await admin
    .from('votes')
    .select('user_id')
    .eq('target_type', 'post')
    .eq('target_id', postId);
  const voterIds = [...new Set((voteRows ?? []).map((v) => v.user_id))].filter((uid) => uid !== user.id);

  if (voterIds.length > 0) {
    await notifyManyIfEnabled(voterIds, 'vote_feedback', {
      post_id: postId,
      post_title: post.title,
      action_label: actionLabel,
    });
  }

  revalidatePath(`/post/${postId}`);
  return { error: null };
}
