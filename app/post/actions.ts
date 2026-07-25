'use server';

import { createClient } from '@/lib/supabase/server';

// 지출/지출 방어 기록을 posts에 insert.
// status, ai_niche, is_spam, confidence 등 AI가 판단할 필드는 절대 넘기지 않음 —
// DB 기본값(status='pending', ai_niche=null, is_spam=false)이 그대로 적용되도록 둠.
// 이 필드들은 3주차 AI 태깅 파이프라인(Claude API, service_role 권한)에서만 채워짐.
export async function createPost(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: '내용을 입력해주세요.' };
  }
  if (trimmed.length > 300) {
    return { error: '300자 이내로 입력해주세요.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    content: trimmed,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
