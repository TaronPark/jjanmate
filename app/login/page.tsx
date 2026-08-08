'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// 소셜 로그인. 카카오 단일(MVP 범위, 2026-07-21 확정) — 피벗과 무관하게 유지.
// 2026-08-02 피벗: niche 쿼리파라미터 전달 로직 제거(온보딩 니치 선택 화면 자체가 폐기됨,
// docs/짠메이트_MVP_기획서_v2.md §2 "폐기 확정 기능" 참고). 콜백은 이제 프로필 존재 여부로만
// 분기한다(app/auth/callback/route.ts).
export default function LoginPage() {
  const handleKakaoLogin = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      alert('로그인 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <main className="page-body" style={{ paddingTop: 40 }}>
      <img
        src="/brand/wordmark.png"
        alt="짠메이트"
        width={140}
        height={140}
        style={{ display: 'block', marginBottom: 24 }}
      />
      <h3 style={{ fontSize: 16, marginBottom: 16 }}>짠메이트 시작하기</h3>
      <button className="btn btn-primary" style={{ marginBottom: 8 }} onClick={handleKakaoLogin}>
        카카오로 시작하기
      </button>
      <p style={{ fontSize: 11, color: 'var(--text-sub)' }}>구글 등 추가 로그인은 2차 확장 예정 (MVP는 카카오 단일)</p>
      <p style={{ fontSize: 11, color: 'var(--text-sub)' }}>
        계속 진행 시 <Link href="/terms">이용약관</Link> 및 <Link href="/privacy">개인정보처리방침</Link>에 동의하게 됩니다.
      </p>
      <p style={{ fontSize: 11, textAlign: 'center', marginTop: 16 }}>
        <Link href="/">로그인 없이 먼저 구경하기</Link>
      </p>
    </main>
  );
}
