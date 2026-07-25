'use server';

import { createClient } from '@/lib/supabase/server';
import type { NicheCode } from '@/lib/niches';

// 로그인 직후 자체 닉네임 + 온보딩 니치를 profiles에 upsert.
// id는 클라이언트가 넘기지 않고, 서버에서 현재 세션(auth.getUser())으로 직접 구함 —
// 클라이언트가 임의의 id를 넘기지 못하게 막기 위함(RLS의 auth.uid()=id 검증과도 이중 방어).
export async function saveNickname(nickname: string, niche: NicheCode) {
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
    onboarding_niche: niche,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
