'use server';

import { createClient } from '@/lib/supabase/server';

// 로그인 직후 자체 닉네임을 profiles에 upsert.
// 2026-08-02 피벗: onboarding_niche 저장 로직 제거(니치 폐기). id는 클라이언트가 넘기지 않고
// 서버에서 현재 세션(auth.getUser())으로 직접 구함 — RLS의 auth.uid()=id 검증과도 이중 방어.
export async function saveNickname(nickname: string) {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return { error: '닉네임을 입력해주세요.' };
  }
  if (trimmed.length > 12) {
    return { error: '닉네임은 12자 이내로 입력해주세요.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    nickname: trimmed,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
