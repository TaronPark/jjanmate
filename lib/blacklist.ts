import { createAdminClient } from '@/lib/supabase/admin';

// 유저 플레어 금지어 검증 (기획서 7-4: 부분문자열 검사 + 공백/특수문자 제거 정규화 검사).
// blacklist_words 테이블은 클라이언트가 절대 못 읽도록 RLS 정책을 아예 안 만들었으므로
// (docs/짠메이트_DB_스키마_설계_v2.md), 이 함수는 반드시 서버 액션에서만, admin(service_role)
// 클라이언트로 호출해야 한다.
function normalize(text: string): string {
  // 공백 + 대부분의 특수문자를 제거한 뒤 소문자로 비교 — "운 영 자", "시!발" 같은 우회 차단.
  return text.toLowerCase().replace(/[\s~!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g, '');
}

export async function containsBlacklistedWord(text: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('blacklist_words').select('word');

  if (error || !data) {
    console.error('블랙리스트 조회 실패:', error?.message);
    // 조회 자체가 실패하면 안전하게 차단(fail-closed) — 검증을 통과시켜 금지어가 새는 것보다
    // 일시적으로 저장이 막히는 편이 낫다.
    return true;
  }

  const normalizedInput = normalize(text);
  if (!normalizedInput) return false;

  return data.some(({ word }) => normalizedInput.includes(normalize(word)));
}
