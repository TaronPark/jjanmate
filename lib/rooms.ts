import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Room, PostFlair } from '@/lib/types';

// 6대 메인 룸 + 24개 포스트 플레어는 DB(docs/짠메이트_DB_스키마_설계_v2.md 시드) 기준 진실원.
// 거의 바뀌지 않는 카탈로그성 데이터라 하드코딩 미러 대신 매 요청 조회 + React cache()로
// 같은 요청 안에서는 중복 쿼리 없이 재사용한다(rooms/post_flairs 합쳐도 30행 미만이라 비용 낮음).
// "짠수다" 룸이 기본값(default room fallback) — 기획서 5-3: "어느 방에 올릴지 고민된다면
// 짠수다 룸에 자유롭게 올려보세요" 안내와 일치시킴.
export const DEFAULT_ROOM_CODE = 'free_chat';

export const getRooms = cache(async (): Promise<Room[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('rooms').select('*').order('display_order');
  if (error) {
    console.error('룸 목록 조회 실패:', error.message);
    return [];
  }
  return data ?? [];
});

export const getRoomByCode = cache(async (code: string): Promise<Room | null> => {
  const rooms = await getRooms();
  return rooms.find((r) => r.code === code) ?? null;
});

export const getRoomById = cache(async (id: string): Promise<Room | null> => {
  const rooms = await getRooms();
  return rooms.find((r) => r.id === id) ?? null;
});

export const getAllFlairs = cache(async (): Promise<PostFlair[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('post_flairs').select('*').order('display_order');
  if (error) {
    console.error('플레어 목록 조회 실패:', error.message);
    return [];
  }
  return data ?? [];
});

export const getFlairsByRoomId = cache(async (roomId: string): Promise<PostFlair[]> => {
  const flairs = await getAllFlairs();
  return flairs.filter((f) => f.room_id === roomId).sort((a, b) => a.display_order - b.display_order);
});

export const getFlairById = cache(async (id: string): Promise<PostFlair | null> => {
  const flairs = await getAllFlairs();
  return flairs.find((f) => f.id === id) ?? null;
});
