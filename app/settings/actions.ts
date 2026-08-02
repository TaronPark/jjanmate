'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// 설정 화면(디자인 시안 "앱 설정 드로어" 참고, MVP는 슬라이드 드로어 대신 전체화면 페이지로
// 단순화 — window.confirm 이탈방지 모달, 단일 이미지 표시 등 이 세션에서 반복된 "문서화된
// 단순화" 원칙과 동일). profiles UPDATE RLS(profiles_update_own, 2026-08-02 추가)가 있어
// 세션 클라이언트로 본인 행만 수정 가능 — admin 클라이언트 불필요.
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
