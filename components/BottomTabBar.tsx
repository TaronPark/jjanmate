'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NavFlameIcon, NavHomeIcon, NavWriteIcon, NavUserIcon } from './icons';

export const LAST_ROOM_STORAGE_KEY = 'jjanmate:lastRoomCode';

interface BottomTabBarProps {
  active: 'popular' | 'room' | 'write' | 'mypage';
  isLoggedIn: boolean;
  // 룸 탭 폴백: profiles.default_room_id가 가리키는 룸 코드(설정 > 룸 탭 기본 룸 지정) 또는
  // 미설정 시 짠수다(free_chat). 실제로는 클라이언트의 localStorage에 저장된 "마지막으로
  // 탐색한 룸"이 있으면 그쪽을 우선한다(기획서 3-3 유저 설정 값 유지 — DB가 아닌
  // localStorage로 처리하기로 확정, docs/짠메이트_DB_스키마_설계_v2.md 확인 필요 항목 1).
  defaultRoomCode: string;
  // 기획서 5-2 맥락 기반 글쓰기 동선: 룸 피드에서 호출하는 쪽이 현재 룸(+활성 플레어)을
  // 쿼리파라미터로 넘겨주면 글쓰기 탭이 2-Step/1-Step 프리셋으로 바로 진입한다.
  // 생략 시(인기 피드 등) 기본 3-Step(/write, 룸 선택부터).
  writeHref?: string;
}

// 2026-08-02 피벗: 기존 3탭(홈/둘러보기/마이페이지) + FAB 구조를 PDF 3-1 스펙의 4탭
// [인기 | 룸 | 글쓰기 | 마이페이지]로 전면 교체. FAB는 새 스펙에 없으므로 완전 제거.
export default function BottomTabBar({ active, isLoggedIn, defaultRoomCode, writeHref = '/write' }: BottomTabBarProps) {
  const router = useRouter();

  const goToRoom = () => {
    const lastRoom = typeof window !== 'undefined' ? localStorage.getItem(LAST_ROOM_STORAGE_KEY) : null;
    router.push(`/room/${lastRoom ?? defaultRoomCode}`);
  };

  const requireLogin = (path: string) => (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      const confirmed = window.confirm('로그인이 필요한 기능이에요. 로그인 화면으로 이동할까요?');
      if (confirmed) router.push('/login');
      return;
    }
    router.push(path);
  };

  const navColor = (isActive: boolean) => (isActive ? '#111' : '#8e8e93');

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item${active === 'popular' ? ' active' : ''}`}>
        <NavFlameIcon color={navColor(active === 'popular')} />
        <span>인기</span>
      </Link>
      <button className={`nav-item${active === 'room' ? ' active' : ''}`} onClick={goToRoom}>
        <NavHomeIcon color={navColor(active === 'room')} />
        <span>룸</span>
      </button>
      <button className={`nav-item${active === 'write' ? ' active' : ''}`} onClick={requireLogin(writeHref)}>
        <NavWriteIcon color={navColor(active === 'write')} />
        <span>글쓰기</span>
      </button>
      <button className={`nav-item${active === 'mypage' ? ' active' : ''}`} onClick={requireLogin('/mypage')}>
        <NavUserIcon color={navColor(active === 'mypage')} />
        <span>마이페이지</span>
      </button>
    </nav>
  );
}
