'use client';

import { useRouter } from 'next/navigation';
import type { NicheCode } from '@/lib/niches';

// 2026-07-25 (매칭 프리뷰 Server Component 리팩터링): app/preview/page.tsx가 async Server
// Component로 바뀌면서 라우팅(useRouter)이 필요한 CTA 버튼만 이 client 컴포넌트로 분리했다.
// LogoutButton.tsx와 같은 이유 — 서버 컴포넌트 안에서는 훅/이벤트 핸들러를 쓸 수 없음.
export default function LoginButton({ niche, label }: { niche: NicheCode; label: string }) {
  const router = useRouter();

  return (
    <button style={{ width: '100%' }} onClick={() => router.push(`/login?niche=${niche}`)}>
      {label}
    </button>
  );
}
