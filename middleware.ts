import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 2026-07-25 SSR 구조 개편: 매 요청마다 Supabase 세션 쿠키를 갱신한다.
// 이게 없으면 Server Component에서 쿠키를 새로 쓸 수 없다는 Next.js 제약 때문에
// 세션이 조용히 만료되거나 새로고침되지 않을 수 있음(Supabase 공식 Next.js SSR 가이드 패턴).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션이 만료 임박이면 여기서 갱신되어 위 setAll을 통해 쿠키에 반영됨.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
