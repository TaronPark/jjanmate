import { createBrowserClient } from '@supabase/ssr';

// 브라우저(클라이언트 컴포넌트)에서만 사용하는 Supabase 클라이언트.
// 2026-07-25: SSR 구조 개편 — 기존 lib/supabase.ts(단일 브라우저 클라이언트, 세션을
// localStorage에 저장)를 client/server 두 개로 분리함. Server Action/Server Component가
// 로그인 세션을 알아야 RLS(auth.uid())가 정상 동작하는데, localStorage는 서버에서 못 읽기
// 때문에 세션을 쿠키에 저장하는 구조로 전환 — 이 파일은 그중 브라우저 쪽 절반.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
