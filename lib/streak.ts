import { createAdminClient } from '@/lib/supabase/admin';
import { getTodayKst, getYesterdayKst } from '@/lib/date';

/**
 * 게시 성공 직후 스트릭을 갱신한다. AI 태깅 성공 여부와 무관하게 "게시 자체"에 대해 인정한다
 * (기획서 4-B 핵심 리텐션 루프: 유저가 글을 남겼다는 행위 자체가 보상 대상).
 *
 * service_role(admin) 클라이언트를 쓰는 이유: 2026-07-25 마이그레이션으로 profiles의 클라이언트
 * UPDATE 정책(profiles_update_own)을 완전히 제거했기 때문에, current_streak/longest_streak/
 * last_post_date는 이제 이 함수(서버 전용 경로)를 통해서만 갱신 가능하다 — posts의 AI 필드를
 * service_role로만 쓸 수 있게 한 것과 동일한 설계 원칙.
 *
 * 분기 로직(KST 기준):
 * - last_post_date === 오늘  -> 이미 오늘 반영됨, 아무것도 하지 않음(하루 1회만 증가)
 * - last_post_date === 어제  -> current_streak + 1
 * - 그 외(더 과거이거나 null, 즉 첫 게시 포함) -> current_streak = 1로 리셋
 * - 위 두 갱신 케이스 모두 longest_streak = max(longest_streak, 새 current_streak)로 통일
 *   (첫 게시자의 longest_streak 기본값 0을 1로 올려주는 케이스도 이 공식 하나로 커버됨)
 * - 마지막에 last_post_date를 오늘(KST)로 갱신
 *
 * 알려진 트레이드오프(2026-07-25 논의, 수정 불필요로 합의): 이 함수는 조회 후 갱신하는
 * read-modify-write 구조라 극단적으로 짧은 시간에 동시 요청이 들어오면 이론상 이중 증가
 * 레이스컨디션이 있을 수 있음. 게시 버튼이 게시 중 비활성화되고 멀티탭 동시게시 같은 극단적
 * 경우에만 해당돼 지금은 별도 락 없이 진행하기로 함.
 *
 * 실패 처리: 스트릭 갱신이 실패해도 게시글 자체는 이미 저장된 상태이므로, 여기서 에러를
 * 던지지 않고 조용히 로그만 남긴다(AI 태깅 실패 처리와 동일한 원칙) — 호출부(app/post/actions.ts)가
 * 이 실패 때문에 게시 흐름을 막지 않도록.
 */
export async function updateStreakOnPost(userId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak, last_post_date')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      throw fetchError ?? new Error('프로필을 찾을 수 없습니다.');
    }

    const today = getTodayKst();
    const yesterday = getYesterdayKst();

    if (profile.last_post_date === today) {
      // 오늘 이미 반영됨 — 하루에 여러 번 게시해도 스트릭은 한 번만 증가
      return;
    }

    const nextCurrentStreak = profile.last_post_date === yesterday ? profile.current_streak + 1 : 1;
    const nextLongestStreak = Math.max(profile.longest_streak, nextCurrentStreak);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        current_streak: nextCurrentStreak,
        longest_streak: nextLongestStreak,
        last_post_date: today,
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }
  } catch (err) {
    console.error(`스트릭 갱신 실패 (userId=${userId}):`, err);
    // 의도적으로 재throw하지 않음 — 게시 흐름은 계속 진행돼야 함
  }
}
