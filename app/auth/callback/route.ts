import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 카카오 로그인 완료 후 돌아오는 콜백. 인가 코드를 세션(쿠키)으로 교환한 뒤,
// profiles 로우 존재 여부로 분기한다.
// 2026-08-02 피벗: niche 쿼리파라미터/온보딩 홈룸 분기 로직 전면 제거 — 룸이 6개 고정
// 카탈로그로 바뀌면서 "가입 시점에 홈룸을 고른다"는 개념 자체가 없어짐(둘러보기/글쓰기에서
// 그때그때 룸을 고르는 구조). 재방문 유저도 신규 유저와 동일하게 인기 피드('/')로 보낸다.
// - 최초 로그인(프로필 없음): /nickname으로 이동
// - 재방문(프로필 있음): 인기 피드('/')로 바로 이동
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        return NextResponse.redirect(`${origin}/`);
      }
      return NextResponse.redirect(`${origin}/nickname`);
    }
  }

  // 코드 교환 실패 시 로그인 화면으로 복귀
  return NextResponse.redirect(`${origin}/login`);
}
