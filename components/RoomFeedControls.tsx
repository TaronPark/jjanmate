'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Room, PostFlair } from '@/lib/types';
import { LAST_ROOM_STORAGE_KEY } from './BottomTabBar';
import { ChevronDownIcon, ClockIcon, NavFlameIcon } from './icons';

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
  // 수정요청사항(2026-08-03, p.5): 게시글 상세 "뒤로가기"로 들어온 경우 — 플레어는 기억값을
  // 무시하고 항상 '전체'로 고정하되, 정렬은 기억된 값(없으면 인기순)을 그대로 유지해야 한다.
  forceFlairReset: boolean;
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
  forceFlairReset,
}: RoomFeedControlsProps) {
  const router = useRouter();

  useEffect(() => {
    if (forceFlairReset) {
      // 플레어는 항상 '전체'(서버에서 이미 activeFlair=undefined로 계산됨)로 고정하고,
      // 정렬만 기억된 값(없으면 기본값 hot=인기순)으로 복원한다.
      const prefs = loadPrefs();
      const remembered = prefs[currentRoom.code];
      const resolvedSort = remembered?.sort ?? 'hot';
      if (resolvedSort !== sort) {
        router.replace(`/room/${currentRoom.code}?sort=${resolvedSort}`);
      } else {
        localStorage.setItem(LAST_ROOM_STORAGE_KEY, currentRoom.code);
      }
      return;
    }

    // URL에 쿼리파라미터가 없는 순수 진입(/room/jachwi)이면, 이 룸에 대해 기억해둔 마지막
    // 정렬/플레어 상태로 즉시 교체한다.
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
        <SortDropdown sort={sort} onChange={(next) => navigate(currentRoom.code, next, activeFlairCode)} />
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

const SORT_OPTIONS: { value: 'hot' | 'new'; label: string }[] = [
  { value: 'hot', label: '인기순' },
  { value: 'new', label: '최신순' },
];

// 수정요청사항(2026-08-03, p.2): 정렬 드롭다운 앞 아이콘이 이모지(🔥/🕒)라 촌스럽다는 지적 —
// 네이티브 <select><option>은 커스텀 SVG 아이콘을 넣을 수 없으므로 직접 만든 토글형 드롭다운으로
// 교체. 인기순은 하단 네비 '인기' 탭과 동일한 NavFlameIcon(물결모양)을, 최신순은 신규 ClockIcon을 사용.
function SortDropdown({ sort, onChange }: { sort: 'hot' | 'new'; onChange: (value: 'hot' | 'new') => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const current = SORT_OPTIONS.find((o) => o.value === sort)!;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="dropdown"
        onClick={() => setOpen((v) => !v)}
        style={{ border: '1px solid var(--border)', font: 'inherit' }}
      >
        {sort === 'hot' ? <NavFlameIcon size={14} /> : <ClockIcon size={14} />}
        {current.label}
        <ChevronDownIcon size={14} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 10,
            minWidth: 110,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: sort === o.value ? 'var(--highlight)' : 'transparent',
                color: 'var(--text-main)',
                fontSize: 13,
                fontWeight: sort === o.value ? 700 : 400,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {o.value === 'hot' ? <NavFlameIcon size={14} /> : <ClockIcon size={14} />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
