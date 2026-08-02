'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getRooms } from '@/lib/rooms';
import { getUnreadNotificationCount } from '@/lib/notifications';
import type { Room } from '@/lib/types';

// 설정 화면(디자인 시안 화면 9 "앱 설정 드로어" 대응, 2026-08-02 시안 통일 작업으로 실제
// 슬라이드 드로어(components/SettingsDrawer.tsx)로 구현 — 이전엔 전체화면 페이지로 축약했었음.
// profiles UPDATE RLS(profiles_update_own, 2026-08-02 추가)가 있어 세션 클라이언트로 본인
// 행만 수정 가능 — admin 클라이언트 불필요.

export interface SettingsData {
  rooms: Room[];
  defaultRoomId: string | null;
  prefs: NotificationPrefs;
  unreadNotificationCount: number;
}

// 헤더 "더보기" 아이콘 클릭 시 드로어가 지연 로딩(lazy load)하는 데이터 — 모든 페이지 헤더에서
// 매번 룸/프로필을 미리 fetch하지 않고, 드로어가 실제로 열릴 때만 가져오기 위함.
export async function getMySettingsData(): Promise<SettingsData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [rooms, { data: profile }, unreadNotificationCount] = await Promise.all([
    getRooms(),
    supabase
      .from('profiles')
      .select('default_room_id, notify_vote_feedback, notify_comment_reply, notify_monthly_badge')
      .eq('id', user.id)
      .single(),
    getUnreadNotificationCount(user.id),
  ]);

  return {
    rooms,
    defaultRoomId: profile?.default_room_id ?? null,
    prefs: {
      notify_vote_feedback: profile?.notify_vote_feedback ?? true,
      notify_comment_reply: profile?.notify_comment_reply ?? true,
      notify_monthly_badge: profile?.notify_monthly_badge ?? true,
    },
    unreadNotificationCount,
  };
}

export async function updateDefaultRoom(roomId: string | null): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase.from('profiles').update({ default_room_id: roomId }).eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/settings');
  revalidatePath('/', 'page');
  return { error: null };
}

export interface NotificationPrefs {
  notify_vote_feedback: boolean;
  notify_comment_reply: boolean;
  notify_monthly_badge: boolean;
}

export async function updateNotificationPrefs(prefs: NotificationPrefs): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase.from('profiles').update(prefs).eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { error: null };
}
