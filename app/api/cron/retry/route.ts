import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runTaggingPipeline } from '@/lib/ai/classifyPost';
import type { NicheCode } from '@/lib/niches';

// AI 태깅 백그라운드 재시도 큐 (4주차, 2026-07-25). Vercel Cron이 하루 1회 호출한다(Hobby
// 플랜 제약, vercel.json 참고). status='system_error'인 글을 최대 3회까지 재시도하고,
// 3회를 다 소진하면(retry_count>=3) 더 이상 이 큐에 잡히지 않고 그대로 system_error로
// 남아 운영진 수동 검토 대상이 된다(기획서 6번 "system_error: 재시도 후 수동 검토 전환").
//
// 재분류/DB 갱신 로직은 새로 만들지 않고 lib/ai/classifyPost.ts의 runTaggingPipeline을 그대로
// 재사용한다 — 성공/저신뢰/재실패 3갈래 분기(요구사항 3번의 Case A/B)가 이미 그 함수 안에
// 구현돼 있어 여기서 중복 구현할 필요가 없음:
//   - 성공 -> status='success'로 갱신, 이 큐에서 자동 제외(다음 조회는 status='system_error'만 보므로)
//   - low_confidence -> status='low_confidence'로 갱신, 마찬가지로 재시도 대상에서 자동 제외
//     (retry_count 미만 3이어도 "재시도 종료" 요구사항이 상태 전환만으로 자연히 충족됨)
//   - 다시 실패 -> retry_count + 1, status는 system_error 유지(runTaggingPipeline 내부에서 처리)
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, content, profiles(onboarding_niche)')
    .eq('status', 'system_error')
    .lt('retry_count', 3)
    .limit(20);

  if (error) {
    console.error('재시도 큐 조회 실패:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const targets = posts ?? [];

  await Promise.all(
    targets.map((post) => {
      const onboardingNiche = (post.profiles as unknown as { onboarding_niche: NicheCode } | null)
        ?.onboarding_niche;
      if (!onboardingNiche) {
        // 이론상 발생 안 함(모든 게시글은 프로필이 있는 유저만 작성 가능) — 방어적으로 스킵
        console.error(`재시도 스킵: postId=${post.id}에 onboarding_niche가 없음`);
        return Promise.resolve();
      }
      return runTaggingPipeline(post.id, post.content, onboardingNiche);
    })
  );

  return NextResponse.json({ ok: true, processed: targets.length });
}
