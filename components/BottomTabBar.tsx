'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { NicheCode } from '@/lib/niches';

interface BottomTabBarProps {
  active: 'home' | 'explore' | 'mypage';
  isLoggedIn: boolean;
  // 로그인 유저의 온보딩 홈룸(profiles.onboarding_niche). 비로그인 유저는 호출하는 쪽에서
  // 'lurker_lounge'(비회원 기본 진입 룸, 기획서 5번 "비회원 피드 열람")를 넘겨준다.
  homeNiche: NicheCode;
}

// 2026-07-26 (UI/UX 개편 스펙 ①) — 하단 고정 탭 바. 메인 피드 진입 이후 화면
// (app/feed/[niche], app/explore, app/mypage)에서만 각 페이지가 개별적으로 렌더링한다.
// 인증 전 화면(로그인/약관/온보딩/닉네임)은 애초에 이 컴포넌트를 import하지 않으므로 별도
// 조건 분기 없이 자연스럽게 숨겨짐.
export default function BottomTabBar({ active, isLoggedIn, homeNiche }: BottomTabBarProps) {
  const router = useRouter();

  const handleMypageClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      const confirmed = window.confirm('로그인이 필요한 기능이에요. 로그인 화면으로 이동할까요?');
      if (confirmed) router.push('/login');
    }
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    textAlign: 'center',
    padding: '8px 0',
    fontSize: 11,
    color: isActive ? '#f5a623' : '#888',
    fontWeight: isActive ? 700 : 400,
    textDecoration: 'none',
  });

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        borderTop: '1px solid #eee',
        background: '#fff',
        zIndex: 10,
      }}
    >
      <Link href={`/feed/${homeNiche}`} style={tabStyle(active === 'home')}>
        <div>🏠</div>
        <div>홈</div>
      </Link>
      <Link href="/explore" style={tabStyle(active === 'explore')}>
        <div>🔍</div>
        <div>둘러보기</div>
      </Link>
      <Link href="/mypage" style={tabStyle(active === 'mypage')} onClick={handleMypageClick}>
        <div>👤</div>
        <div>마이페이지</div>
      </Link>
    </nav>
  );
}
