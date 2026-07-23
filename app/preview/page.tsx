'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { NICHES, ctaByNiche, type NicheCode } from '@/lib/niches';

// 4-A 3번: 매칭 프리뷰. 2026-07-21 검토 반영 — 블러 없이 본문 실제 노출, 닉네임만 마스킹.
// TODO(3~5주차): 더미 카드를 matching_previews 테이블(니치별 캐시)로 교체
export default function PreviewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const niche = (params.get('niche') as NicheCode) || 'self_catering';

  return (
    <main>
      <h3>이런 분들과 매칭돼요</h3>
      <div className="card">
        <p style={{ fontSize: 11, color: '#0c447c', margin: '0 0 4px' }}>[{NICHES[niche].label} 동료]</p>
        <p style={{ fontSize: 13, margin: 0 }}>오늘도 도시락 싸서 배달비 3000원 절약했어요</p>
      </div>
      <div className="card">
        <p style={{ fontSize: 11, color: '#0c447c', margin: '0 0 4px' }}>[{NICHES[niche].label} 동료]</p>
        <p style={{ fontSize: 13, margin: 0 }}>편의점 끊은지 일주일째, 식비 2만원 절약중</p>
      </div>
      <p style={{ fontSize: 13, color: '#555' }}>{ctaByNiche[niche]}</p>
      <button style={{ width: '100%' }} onClick={() => router.push('/login')}>
        {niche === 'no_spend_challenge' ? '지금 방에 입장하기' : '가입하고 계속하기'}
      </button>
    </main>
  );
}
