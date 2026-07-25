'use server';

import { createClient } from '@/lib/supabase/server';
import { runTaggingPipeline, type TaggingOutcome } from '@/lib/ai/classifyPost';
import { updateStreakOnPost } from '@/lib/streak';

export interface CreatePostResult {
  error: string | null;
  // 아래 3개는 error가 null일 때만 의미 있음. app/post/page.tsx가 이 값으로 리다이렉트
  // 대상을 결정한다(게시 후 상태 피드백 설계, 2026-07-25 — "유령 게시물" 문제 해결):
  // - status='success' && mismatch=false -> 원래 있던 룸 그대로
  // - status='success' && mismatch=true  -> ai_niche(재분류된 니치) 룸으로 자동 이동 + 안내 배너
  // - status='low_confidence' | 'system_error' -> 원래 있던 룸에 남김(ai_niche가 null이라
  //   피드 쿼리가 "본인 글이면 ai_niche=null도 포함"하도록 확장돼 있어야 보임, feed 페이지 참고).
  //   상태 카드로 표시하고 수동 재시도 버튼은 두지 않음(기획서 6번: low_confidence는 재시도 없음,
  //   system_error는 4주차 백그라운드 큐가 재시도 — 유저가 직접 재시도를 트리거하지 않는다)
  ai_niche: TaggingOutcome['ai_niche'] | null;
  status: TaggingOutcome['status'] | 'pending' | null;
  niche_hint_mismatch: boolean | null;
}

// 게시글 이미지의 공개 URL은 반드시 우리 post_images 버킷에서 나온 값이어야 함(2026-07-25).
// 클라이언트가 이 값을 검증 없이 넘긴 그대로 저장하면, 악의적 유저가 우리 Storage를 거치지
// 않고 임의의 외부 URL(유해/불법 콘텐츠 등)을 넣어 다른 유저 피드에 그대로 노출시킬 수 있음 —
// AI 필드/스트릭 필드에 적용해온 "클라이언트가 신뢰 못 할 값은 서버가 검증" 원칙과 동일하게,
// 이 URL이 실제로 그 버킷 경로로 시작하는지 검증하고 아니면 거부한다.
function isValidPostImageUrl(url: string): boolean {
  const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post_images/`;
  return url.startsWith(expectedPrefix);
}

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
//
// imageUrl(2026-07-25 추가): 브라우저에서 browser-image-compression으로 압축한 뒤
// Storage(post_images 버킷)에 이미 업로드까지 마친 상태로 이 액션에 도달함 — 여기서는
// 업로드를 하지 않고 URL 검증 후 저장만 한다.
export async function createPost(content: string, imageUrl?: string | null): Promise<CreatePostResult> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: '내용을 입력해주세요.', ai_niche: null, status: null, niche_hint_mismatch: null };
  }
  if (trimmed.length > 300) {
    return { error: '300자 이내로 입력해주세요.', ai_niche: null, status: null, niche_hint_mismatch: null };
  }

  let validatedImageUrl: string | null = null;
  if (imageUrl) {
    if (!isValidPostImageUrl(imageUrl)) {
      return { error: '잘못된 이미지 URL입니다.', ai_niche: null, status: null, niche_hint_mismatch: null };
    }
    validatedImageUrl = imageUrl;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.', ai_niche: null, status: null, niche_hint_mismatch: null };
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ user_id: user.id, content: trimmed, image_url: validatedImageUrl })
    .select('id')
    .single();

  if (error || !post) {
    return {
      error: error?.message ?? '게시글 저장에 실패했습니다.',
      ai_niche: null,
      status: null,
      niche_hint_mismatch: null,
    };
  }

  // insert가 성공한 시점에 스트릭을 갱신한다 — AI 분류 결과(성공/저신뢰/에러)와 무관하게
  // "게시 자체"에 대해 인정(4-B 핵심 리텐션 루프). 실패해도 게시 흐름을 막지 않도록
  // updateStreakOnPost 내부에서 이미 에러를 삼키므로 여기서는 await만 한다.
  await updateStreakOnPost(user.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_niche')
    .eq('id', user.id)
    .single();

  if (!profile?.onboarding_niche) {
    // 정상 플로우라면 여기 올 수 없음(닉네임 화면에서 항상 onboarding_niche를 같이 저장) —
    // 방어적으로 게시 자체는 성공 처리하되 태깅은 건너뜀. 이 글은 status='pending'으로 남아
    // 있다가 이후 재게시/재시도 로직 정비 시 함께 다뤄야 함(현재는 발생 안 하는 것으로 간주).
    return { error: null, ai_niche: null, status: 'pending', niche_hint_mismatch: null };
  }

  const outcome = await runTaggingPipeline(post.id, trimmed, profile.onboarding_niche);

  return { error: null, ...outcome };
}
