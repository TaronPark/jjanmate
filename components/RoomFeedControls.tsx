'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Room, PostFlair } from '@/lib/types';
import { LAST_ROOM_STORAGE_KEY } from './BottomTabBar';

const PREFS_KEY = 'jjanmate:roomFeedPrefs';

type RoomPrefs = Record<string, { sort: 'hot' | 'new'; flair: string | null }>;

function loadPrefs(): RoomPrefs {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function savePrefs(roomCode: string, sort: 'hot' | 'new', flair: string | null) {
  const prefs = loadPrefs();
  prefs[roomCode] = { sort, flair };
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  localStorage.setItem(LAST_ROOM_STORAGE_KEY, roomCode);
}

interface RoomFeedControlsProps {
  rooms: Room[];
  currentRoom: Room;
  flairs: PostFlair[];
  sort: 'hot' | 'new';
  activeFlairCode: string | null;
  // URL에 sort/flair 쿼리파라미터가 아예 없었는지(=클라이언트 저장값으로 복원해야 하는지) 여부
  hasExplicitParams: boolean;
}

// 기획서 3-2 ②/3-3: 룸 피드 상단 컨트롤러(1열 정렬+룸 선택, 2열 플레어 칩) +
// 유저 설정 값 유지(localStorage, docs/짠메이트_DB_스키마_설계_v2.md 확인 필요 항목 1 결론).
export default function RoomFeedControls({
  rooms,
  currentRoom,
  flairs,
  sort,
  activeFlairCode,
  hasExplicitParams,
}: RoomFeedControlsProps) {
  const router = useRouter();

  // URL에 쿼리파라미터가 없는 순수 진입(/room/jachwi)이면, 이 룸에 대해 기억해둔 마지막
  // 정렬/플레어 상태로 즉시 교체한다.
  useEffect(() => {
    if (hasExplicitParams) return;
    const prefs = loadPrefs();
    const remembered = prefs[currentRoom.code];
    if (remembered && (remembered.sort !== sort || remembered.flair !== activeFlairCode)) {
      const query = new URLSearchParams();
      query.set('sort', remembered.sort);
      if (remembered.flair) query.set('flair', remembered.flair);
      router.replace(`/room/${currentRoom.code}?${query.toString()}`);
    } else {
      // 기억된 값이 없어도 "마지막으로 본 룸"만은 갱신해둔다(하단 탭바 룸 탭용).
      localStorage.setItem(LAST_ROOM_STORAGE_KEY, currentRoom.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = (roomCode: string, nextSort: 'hot' | 'new', flairCode: string | null) => {
    savePrefs(roomCode, nextSort, flairCode);
    const query = new URLSearchParams();
    query.set('sort', nextSort);
    if (flairCode) query.set('flair', flairCode);
    router.push(`/room/${roomCode}?${query.toString()}`);
  };

  const handleFlairClick = (flairCode: string) => {
    const next = activeFlairCode === flairCode ? null : flairCode;
    navigate(currentRoom.code, sort, next);
  };

  return (
    <div className="filter-bar">
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <select
          className="dropdown"
          value={sort}
          onChange={(e) => navigate(currentRoom.code, e.target.value as 'hot' | 'new', activeFlairCode)}
        >
          <option value="hot">🔥 인기순</option>
          <option value="new">🕒 최신순</option>
        </select>
        <select className="dropdown" value={currentRoom.code} onChange={(e) => navigate(e.target.value, sort, null)} style={{ flex: 1 }}>
          {rooms.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-sub)', margin: '8px 0 0' }}>{currentRoom.subtitle}</p>

      <div className="flair-chips">
        <button
          onClick={() => navigate(currentRoom.code, sort, null)}
          className={`chip${activeFlairCode === null ? ' active' : ''}`}
        >
          전체
        </button>
        {flairs.map((f) => {
          const active = activeFlairCode === f.code;
          return (
            <button key={f.id} onClick={() => handleFlairClick(f.code)} className={`chip${active ? ' active' : ''}`}>
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
