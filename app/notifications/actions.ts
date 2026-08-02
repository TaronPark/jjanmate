'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// notifications RLS는 본인 행에 한해 update를 허용하므로(schema.sql §12) 세션 클라이언트로
// 충분하다 — admin 클라이언트가 필요 없음(생성만 admin, 읽음처리는 본인 세션).
export async function markNotificationRead(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/notifications');
  return { error: null };
}

export async function markAllNotificationsRead(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
  if (error) return { error: error.message };

  revalidatePath('/notifications');
  return { error: null };
}
