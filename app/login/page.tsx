'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { NicheCode } from '@/lib/niches';

// 4-A 4번: 소셜 로그인. 카카오 단일(MVP 범위, 2026-07-21 확정).
// 2026-07-25: 실제 Supabase Kakao Provider OAuth 호출로 교체.
// 동작 전제조건(코드 밖 설정, 사람이 직접 해야 함):
//   1) 카카오 개발자 콘솔(developers.kakao.com)에 앱 등록 + REST API Key/Client Secret 발급
//   2) Supabase 대시보드 > Authentication > Providers > Kakao 활성화 + 위 키 입력
// 2026-07-25 SSR 구조 개편: redirectTo를 /nickname으로 직접 보내지 않고 /auth/callback으로
// 보냄 — 콜백 라우트가 인가 코드를 세션(쿠키)으로 교환한 뒤, 신규/재방문 유저를 각각
// /nickname 또는 본인 홈룸 피드로 분기함(app/auth/callback/route.ts 참고).
// niche 쿼리파라미터는 preview -> login -> callback으로 이어지며, 신규 유저의 경우
// 콜백에서 그대로 /nickname?niche=...로 전달됨.
function LoginContent() {
  const params = useSearchParams();
  const niche = (params.get('niche') as NicheCode) || 'monthly_rent_fighter';

  const handleKakaoLogin = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?niche=${niche}`,
      },
    });
    if (error) {
      alert('로그인 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <main>
      <h3>짠메이트 시작하기</h3>
      <button style={{ width: '100%', marginBottom: 8 }} onClick={handleKakaoLogin}>
        카카오로 시작하기
      </button>
      <p style={{ fontSize: 11, color: '#888' }}>구글 등 추가 로그인은 2차 확장 예정 (MVP는 카카오 단일)</p>
      <p style={{ fontSize: 11, color: '#888' }}>
        계속 진행 시 <Link href="/terms">이용약관</Link> 및 <Link href="/privacy">개인정보처리방침</Link>에 동의하게 됩니다.
        {/* 2026-07-25: 두 문서 모두 초안(법률 검토 전) 상태 — docs/짠메이트_이용약관.md, docs/짠메이트_개인정보처리방침.md 참고 */}
      </p>
      {/* 2026-07-25: 비회원 피드 진입점(기획서 5번 Must "비회원 피드 열람"). 진입장벽이 가장
          낮은 눈팅러 대기실로 보냄 — 아직 이 니치로 분류된 글이 적어 당장은 빈 피드로 보일 수
          있으나(정상, 데이터 양 문제), 니치 자체가 "대기실" 컨셉이라 의미상으로도 맞는 선택. */}
      <p style={{ fontSize: 11, textAlign: 'center', marginTop: 16 }}>
        <Link href="/feed/lurker_lounge">로그인 없이 먼저 구경하기</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
