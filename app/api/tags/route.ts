import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runTaggingPipeline } from '@/lib/ai/classifyPost';
import type { NicheCode } from '@/lib/niches';

/**
 * 게시글 하나를 AI 태깅 파이프라인에 태우는 Route Handler.
 *
 * 설계 노트: 요청 바디는 postId만 받는다(content/onboardingNiche를 프론트가 직접 보내지 않음).
 * 이유 — 만약 클라이언트가 content를 자유롭게 실어 보낼 수 있다면, 실제 DB에 저장된 글과 다른
 * 내용으로 분류를 요청하거나(무결성 깨짐), 타인의 postId에 임의 텍스트를 실어 그 사람 게시글의
 * ai_niche 등을 오염시키는 것도 이론상 가능해진다. 그래서 이 라우트는 postId만 받고, 실제
 * 분류 대상 content/onboardingNiche는 항상 서버가 DB에서 직접 다시 읽어온다 — posts UPDATE에
 * RLS 정책을 아예 두지 않은 것과 같은 맥락(AI 판단 관련 데이터는 클라이언트가 값을 실어 보내는
 * 방식 자체를 허용하지 않는다).
 *
 * 인증/소유권 검증: SSR(쿠키 세션 기반, RLS 적용) 클라이언트로 게시글을 조회한다. status='pending'인
 * 글은 공개 조회 조건(status='success' AND is_spam=false)에 해당하지 않으므로, RLS상 작성자
 * 본인만 조회 가능 — 즉 이 조회가 성공하고 user_id가 본인과 일치하면 자동으로 "본인 글"임이
 * 증명된다. 실제 posts UPDATE(ai_niche 등 반영)는 runTaggingPipeline 내부의 service_role
 * 클라이언트(lib/supabase/admin.ts)가 수행한다.
 */
export async function POST(request: Request) {
  let body: { postId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const { postId } = body;
  if (!postId) {
    return NextResponse.json({ error: 'postId가 필요합니다.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, content, user_id, profiles(onboarding_niche)')
    .eq('id', postId)
    .single();

  if (fetchError || !post || post.user_id !== user.id) {
    return NextResponse.json({ error: '본인 게시글만 분류를 요청할 수 있습니다.' }, { status: 403 });
  }

  const onboardingNiche = (post.profiles as unknown as { onboarding_niche: NicheCode } | null)
    ?.onboarding_niche;
  if (!onboardingNiche) {
    return NextResponse.json({ error: '프로필 정보를 확인할 수 없습니다.' }, { status: 400 });
  }

  await runTaggingPipeline(post.id, post.content, onboardingNiche);

  return NextResponse.json({ ok: true });
}
