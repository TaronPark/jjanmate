'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NICHES, ctaByNiche, type NicheCode } from '@/lib/niches';

// 4-A 3번: 매칭 프리뷰. 2026-07-21 검토 반영 — 블러 없이 본문 실제 노출, 닉네임만 마스킹.
// TODO(3~5주차): 더미 카드를 matching_previews 테이블(니치별 캐시)로 교체
// 2026-07-25: useSearchParams 사용부를 Suspense로 감쌈 — Vercel 프로덕션 빌드(next build)에서
// "useSearchParams() should be wrapped in a suspense boundary" 에러로 배포가 실패해 수정함
// (npm run dev는 이 규칙을 강제하지 않아 로컬에서는 못 잡았던 문제).
function PreviewContent() {
  const router = useRouter();
  const params = useSearchParams();
  const niche = (params.get('niche') as NicheCode) || 'monthly_rent_fighter';

  return (
    <main>
      <h3>이런 분들과 매칭돼요</h3>
      <div className="card">
        <p style={{ fontSize: 11, color: '#0c447c', margin: '0 0 4px' }}>[{NICHES[niche].maskLabel} 동료]</p>
        <p style={{ fontSize: 13, margin: 0 }}>보일러 외출모드 켜두고 냉장고 파먹기로 이번 달 관리비 방어중</p>
      </div>
      <div className="card">
        <p style={{ fontSize: 11, color: '#0c447c', margin: '0 0 4px' }}>[{NICHES[niche].maskLabel} 동료]</p>
        <p style={{ fontSize: 13, margin: 0 }}>택시비 참고 버스 탔더니 잔바리 지출 3000원 방어 성공</p>
      </div>
      <p style={{ fontSize: 13, color: '#555' }}>{ctaByNiche[niche]}</p>
      <button style={{ width: '100%' }} onClick={() => router.push(`/login?niche=${niche}`)}>
        {niche === 'lurker_lounge' ? '지금 아지트 입장해서 구경하기' : '가입하고 계속하기'}
      </button>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={null}>
      <PreviewContent />
    </Suspense>
  );
}
