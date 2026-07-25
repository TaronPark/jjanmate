'use client';

import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { NicheCode } from '@/lib/niches';

// 4-A 4번: 소셜 로그인. 카카오 단일(MVP 범위, 2026-07-21 확정).
// 2026-07-25: 실제 Supabase Kakao Provider OAuth 호출로 교체.
// 동작 전제조건(코드 밖 설정, 사람이 직접 해야 함):
//   1) 카카오 개발자 콘솔(developers.kakao.com)에 앱 등록 + REST API Key/Client Secret 발급
//   2) Supabase 대시보드 > Authentication > Providers > Kakao 활성화 + 위 키 입력
// niche는 preview -> login -> nickname -> post로 쿼리파라미터를 이어받아, 온보딩 완료 후
// 원래 선택했던 룸의 게시 화면으로 바로 돌아가도록 함.
// 2026-07-25: 로그인 직후 바로 /post가 아니라 /nickname(자체 닉네임 입력)으로 이동하도록 변경 —
// 카카오 닉네임/프로필사진을 가져오지 않기로 했기 때문(자세한 판단 근거는 app/nickname 참고).
export default function LoginPage() {
  const params = useSearchParams();
  const niche = (params.get('niche') as NicheCode) || 'monthly_rent_fighter';

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/nickname?niche=${niche}`,
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
      <p style={{ fontSize: 11, color: '#888' }}>계속 진행 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.</p>
    </main>
  );
}
