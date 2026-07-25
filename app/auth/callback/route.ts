import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { NicheCode } from '@/lib/niches';

// 카카오 로그인 완료 후 돌아오는 콜백. 인가 코드를 세션(쿠키)으로 교환한 뒤,
// profiles 로우 존재 여부로 분기한다.
// - 최초 로그인(프로필 없음): 온보딩에서 고른 niche와 함께 /nickname으로 이동
// - 재방문(프로필 있음): 닉네임 화면을 건너뛰고 본인이 이미 선택한 홈룸(onboarding_niche)
//   피드로 바로 이동 — 매번 닉네임을 다시 입력하게 하는 건 나쁜 UX라 2026-07-25 추가.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const fallbackNiche = (searchParams.get('niche') as NicheCode) || 'monthly_rent_fighter';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_niche')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        return NextResponse.redirect(`${origin}/feed/${profile.onboarding_niche}`);
      }
      return NextResponse.redirect(`${origin}/nickname?niche=${fallbackNiche}`);
    }
  }

  // 코드 교환 실패 시 로그인 화면으로 복귀
  return NextResponse.redirect(`${origin}/login`);
}
