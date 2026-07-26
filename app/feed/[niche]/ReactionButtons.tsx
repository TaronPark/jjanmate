'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleReaction } from '../actions';

interface ReactionButtonsProps {
  postId: string;
  isLoggedIn: boolean;
  initialCheerCount: number;
  initialMeTooCount: number;
  initialHasCheered: boolean;
  initialHasMeTooed: boolean;
}

// 2026-07-26 (UI/UX 개편 스펙 ④) — 크고 각진 텍스트 버튼(대단해요 5)에서 인스타그램/스레드
// 스타일의 얇은 아웃라인 아이콘+카운트 칩(👍 5)으로 축소. 클릭 시 배경이 Primary 컬러로
// 채워지는 토글 자체는 기존 그대로 유지, 텍스트 라벨은 넣지 않음(아이콘+카운트만).
const CHIP_STYLE = {
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid #ddd',
  background: '#fff',
  color: '#555',
} as const;
const ACTIVE_STYLE = { background: '#f5a623', border: '1px solid #f5a623', color: '#fff', fontWeight: 700 } as const;

// 2026-07-25: 게시글 카드 중 이 버튼 쌍만 인터랙티브(클라이언트 컴포넌트)로 분리 —
// 나머지 카드 내용(본문/닉네임/시간)은 여전히 서버 컴포넌트(app/feed/[niche]/page.tsx)에
// 남겨서 클라이언트 번들을 최소화함.
//
// 낙관적 UI: 클릭 즉시 로컬 state를 먼저 바꾸고 useTransition으로 서버 액션을 백그라운드
// 처리, 실패하면 롤백. toggleReaction이 revalidatePath로 서버 캐시는 갱신하지만, 이미 마운트된
// 이 컴포넌트의 로컬 state까지 자동 재동기화되진 않음 — 즉 "내 클릭"은 항상 정확하게 보이지만
// 같은 화면을 보는 다른 유저의 반응이 실시간으로 반영되진 않음(새로고침 시 반영). 실시간 동기화는
// 이번 요구사항에 없어 이대로 둠.
export default function ReactionButtons({
  postId,
  isLoggedIn,
  initialCheerCount,
  initialMeTooCount,
  initialHasCheered,
  initialHasMeTooed,
}: ReactionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cheerCount, setCheerCount] = useState(initialCheerCount);
  const [meTooCount, setMeTooCount] = useState(initialMeTooCount);
  const [hasCheered, setHasCheered] = useState(initialHasCheered);
  const [hasMeTooed, setHasMeTooed] = useState(initialHasMeTooed);

  const handleClick = (type: 'cheer' | 'me_too') => {
    if (!isLoggedIn) {
      const confirmed = window.confirm('로그인하고 동료들을 응원해보세요! 로그인 화면으로 이동할까요?');
      if (confirmed) {
        router.push('/login');
      }
      return;
    }

    const prevHasCheered = hasCheered;
    const prevHasMeTooed = hasMeTooed;
    const prevCheerCount = cheerCount;
    const prevMeTooCount = meTooCount;

    if (type === 'cheer') {
      setHasCheered(!prevHasCheered);
      setCheerCount(prevCheerCount + (prevHasCheered ? -1 : 1));
    } else {
      setHasMeTooed(!prevHasMeTooed);
      setMeTooCount(prevMeTooCount + (prevHasMeTooed ? -1 : 1));
    }

    startTransition(async () => {
      const result = await toggleReaction(postId, type);
      if (result.error) {
        // 실패 시 낙관적으로 바꿨던 값을 원래대로 되돌림
        setHasCheered(prevHasCheered);
        setHasMeTooed(prevHasMeTooed);
        setCheerCount(prevCheerCount);
        setMeTooCount(prevMeTooCount);
      }
    });
  };

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        style={{ ...CHIP_STYLE, ...(hasCheered ? ACTIVE_STYLE : undefined) }}
        disabled={isPending}
        onClick={() => handleClick('cheer')}
        aria-label="대단해요"
      >
        👍 {cheerCount}
      </button>
      <button
        style={{ ...CHIP_STYLE, ...(hasMeTooed ? ACTIVE_STYLE : undefined) }}
        disabled={isPending}
        onClick={() => handleClick('me_too')}
        aria-label="나도 절약중"
      >
        🙌 {meTooCount}
      </button>
    </div>
  );
}
