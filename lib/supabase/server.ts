import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 서버(Server Component/Server Action/Route Handler)에서만 사용하는 Supabase 클라이언트.
// 요청의 쿠키에서 세션을 읽기 때문에, 이 클라이언트로 만든 쿼리는 "지금 로그인한 사람"
// 기준으로 RLS(auth.uid())가 정확히 적용됨 — service_role 키가 아니므로 RLS를 우회하지 않음.
//
// Server Component 렌더링 중에는 쿠키를 실제로 쓸 수 없어서(Next.js 제약) setAll이 실패할 수
// 있는데, 이건 middleware.ts가 세션 갱신을 대신 처리하므로 여기서는 조용히 무시해도 안전함.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출된 경우 무시 — middleware.ts가 세션 갱신을 담당
          }
        },
      },
    }
  );
}
