import { createClient } from '@supabase/supabase-js';

/**
 * service_role 키를 쓰는 백엔드 전용 Supabase 클라이언트. RLS를 완전히 우회한다.
 *
 * 반드시 서버 코드(Route Handler, Server Action 등)에서만 import할 것 — 절대 클라이언트
 * 컴포넌트나 'use client' 파일에서 사용하지 말 것. SUPABASE_SERVICE_ROLE_KEY는
 * NEXT_PUBLIC_ 접두어가 없으므로 브라우저 번들에는 포함되지 않지만, 실수로라도 client.ts처럼
 * 클라이언트 코드에서 import하면 빌드는 되되 undefined 키로 인증 실패하므로 여기서 막지는 않음
 * (사용처가 lib/ai/classifyPost.ts 하나뿐이라 현재는 리스크 낮음).
 *
 * 사용처: lib/ai/classifyPost.ts의 runTaggingPipeline만. posts.ai_niche/status 등
 * AI 전용 필드는 posts 테이블에 UPDATE RLS 정책이 아예 없어(schema.sql 참고, 의도적 설계),
 * 일반 유저 세션 클라이언트로는 절대 쓸 수 없고 이 service_role 클라이언트만 쓸 수 있다.
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
