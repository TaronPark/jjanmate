'use server';

import { createClient } from '@/lib/supabase/server';
import { runTaggingPipeline } from '@/lib/ai/classifyPost';

// 지출/지출 방어 기록을 posts에 insert.
// status, ai_niche, is_spam, confidence 등 AI가 판단할 필드는 절대 넘기지 않음 —
// DB 기본값(status='pending', ai_niche=null, is_spam=false)이 그대로 적용되도록 둠.
// 이 필드들은 3주차 AI 태깅 파이프라인(runTaggingPipeline, service_role 권한)에서만 채워짐.
//
// 2026-07-25: insert 직후 여기서 바로 runTaggingPipeline을 await한다(HTTP로 자체
// /api/tags를 다시 호출하지 않음 — 이미 인증된 user/content를 들고 있어 왕복이 불필요).
// Vercel 서버리스 함수는 응답을 보낸 뒤 백그라운드 작업 지속을 보장하지 않으므로(별도
// waitUntil 없이는), 분류를 fire-and-forget으로 던지면 중간에 끊길 수 있어 명시적으로 기다린다.
// app/post/page.tsx의 "AI가 읽는 중..." 화면(Labor Illusion 최소 1.2초)과 자연스럽게 맞물림 —
// 실제 처리 시간이 1.2초보다 길면 그만큼 더 보여지고, 짧으면 1.2초까지 채워짐.
// 분류 자체가 실패해도 게시글은 이미 저장된 상태이므로 에러를 삼키지 않고 그대로 진행—
// 실패 시 상태는 runTaggingPipeline 내부에서 status='system_error'로 이미 기록됨.
export async function createPost(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: '내용을 입력해주세요.' };
  }
  if (trimmed.length > 300) {
    return { error: '300자 이내로 입력해주세요.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ user_id: user.id, content: trimmed })
    .select('id')
    .single();

  if (error || !post) {
    return { error: error?.message ?? '게시글 저장에 실패했습니다.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_niche')
    .eq('id', user.id)
    .single();

  if (profile?.onboarding_niche) {
    await runTaggingPipeline(post.id, trimmed, profile.onboarding_niche);
  }

  return { error: null };
}
