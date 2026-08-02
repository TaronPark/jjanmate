'use client';

import { useState, useTransition } from 'react';
import { toggleBookmark } from '@/app/bookmarks/actions';
import { BookmarkIcon } from './icons';

// 기획서 3-4: 1-Tap 즉시 토글(Optimistic UI). 하단 토스트 안내는 MVP 1차 범위에서는
// 생략하고(간단 alert 대체), 아이콘 상태 전환만 우선 구현 — 추후 보강 가능.
export default function BookmarkButton({ postId, initialBookmarked }: { postId: string; initialBookmarked: boolean }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prev = bookmarked;
    setBookmarked(!prev);

    startTransition(async () => {
      const result = await toggleBookmark(postId);
      if (result.error) {
        setBookmarked(prev);
        if (result.error === '로그인이 필요합니다.') {
          alert('로그인이 필요한 기능이에요.');
        }
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      aria-label="북마크"
      style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: bookmarked ? '#111' : '#bbb' }}
    >
      <BookmarkIcon size={18} active={bookmarked} />
    </button>
  );
}
