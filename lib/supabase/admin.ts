import { createClient } from '@supabase/supabase-js';

/**
 * service_role 키를 쓰는 백엔드 전용 Supabase 클라이언트. RLS를 완전히 우회한다.
 *
 * 반드시 서버 코드(Route Handler, Server Action 등)에서만 import할 것 — 절대 클라이언트
 * 컴포넌트나 'use client' 파일에서 사용하지 말 것. SUPABASE_SERVICE_ROLE_KEY는
 * NEXT_PUBLIC_ 접두어가 없으므로 브라우저 번들에는 포함되지 않지만, 실수로라도 클라이언트
 * 코드에서 import하면 빌드는 되되 undefined 키로 인증 실패하므로 여기서 막지는 않음.
 *
 * 사용처(2026-08-02 피벗 이후): lib/blacklist.ts(금지어 조회), app/mypage/actions.ts(소유권
 * 검증 후 소프트 삭제), app/post/[id]/actions.ts(작성자 액션 상태 변경),
 * app/api/cron/monthly-badges/route.ts(월간 배지 집계·insert). posts/comments는 client
 * UPDATE/DELETE RLS 정책이 아예 없고(schema.sql 참고, 의도적 설계), monthly_badges/
 * blacklist_words는 client가 아예 읽거나 쓸 수 없으므로 이 service_role 클라이언트만 쓸 수 있다.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
