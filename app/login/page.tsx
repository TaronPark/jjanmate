'use client';

// 4-A 4번: 소셜 로그인. 카카오 단일(MVP 범위, 2026-07-21 확정).
// TODO(1~2주차): 카카오 개발자 콘솔에 앱 등록 후, Supabase Auth의 Kakao Provider를 켜고
// supabase.auth.signInWithOAuth({ provider: 'kakao' })로 교체
export default function LoginPage() {
  const handleKakaoLogin = () => {
    alert('카카오 로그인 연동은 1~2주차 작업 예정입니다. (카카오 개발자 앱 등록 필요)');
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
