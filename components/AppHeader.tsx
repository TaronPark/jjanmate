'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SettingsDrawer from './SettingsDrawer';
import { EditPencilIcon, MoreVerticalIcon } from './icons';

// 시안 화면 0 "글로벌 헤더" 대응 — 좌측 세리프 로고 + 연필(글쓰기 바로가기)/더보기(설정 드로어)
// 아이콘. 모든 주요 화면 상단에서 재사용해 헤더 룩을 통일한다. writeHref는 룸 피드처럼
// 맥락 프리셋(?room=...&flair=...)이 있는 화면에서 그대로 이어받아 글쓰기 진입 시 반영한다.
export default function AppHeader({ isLoggedIn, writeHref = '/write' }: { isLoggedIn: boolean; writeHref?: string }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleWriteClick = () => {
    if (!isLoggedIn) {
      const confirmed = window.confirm('로그인이 필요한 기능이에요. 로그인 화면으로 이동할까요?');
      if (confirmed) router.push('/login');
      return;
    }
    router.push(writeHref);
  };

  return (
    <>
      <header className="app-header">
        <Link href="/" className="logo-text">
          Jjanmate
        </Link>
        <div className="header-actions">
          <button className="header-icon" onClick={handleWriteClick} aria-label="글쓰기">
            <EditPencilIcon size={22} color="#111" />
          </button>
          <button className="header-icon" onClick={() => setDrawerOpen(true)} aria-label="더보기">
            <MoreVerticalIcon size={22} color="#111" />
          </button>
        </div>
      </header>
      {drawerOpen && <SettingsDrawer onClose={() => setDrawerOpen(false)} />}
    </>
  );
}
