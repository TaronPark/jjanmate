'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 2026-07-25: 인앱 로그아웃 버튼(4주차 QA 병목 해소 + 필수 UX). 프로젝트 최초의 top-level
// components/ 디렉토리 — 지금까지는 라우트별 app/*/actions.ts 컨벤션이었지만, 이 버튼은
// 특정 라우트에 속하지 않고 여러 화면에서 재사용될 수 있어 별도로 뺌.
//
// 브라우저 클라이언트(@supabase/ssr createBrowserClient)로 signOut()을 호출해야 세션 쿠키가
// 실제로 지워짐 — 서버 컴포넌트/서버 액션에서는 이 버튼을 만들 수 없어 'use client'로 분리.
// 의도적으로 전역 레이아웃(app/layout.tsx)에는 넣지 않음 — 랜딩/프리뷰/약관 등 하드코딩
// 유지 중인 페이지들까지 건드리게 되는 걸 피하기 위해, 지금은 피드 헤더에서만 import해서 씀.
export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button className="btn btn-secondary" onClick={handleLogout}>
      로그아웃
    </button>
  );
}
