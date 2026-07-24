'use client';

import { useRouter } from 'next/navigation';
import { NICHES, NICHE_CODES, type NicheCode } from '@/lib/niches';

// 4-A 2번: 온보딩 니치 선택. 선택 즉시 매칭 프리뷰(3번)로 이동.
// TODO(1~2주차): 선택값을 세션/쿼리로 넘겨 /preview에서 읽도록 연결
export default function OnboardingPage() {
  const router = useRouter();

  const selectNiche = (code: NicheCode) => {
    router.push(`/preview?niche=${code}`);
  };

  return (
    <main>
      <h3>지금 어떤 상황이신가요</h3>
      {NICHE_CODES.map((code) => (
        <button
          key={code}
          onClick={() => selectNiche(code)}
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8 }}
        >
          {NICHES[code].label} <span style={{ color: '#888', fontSize: 12 }}>{NICHES[code].description}</span>
        </button>
      ))}
      <button
        onClick={() => selectNiche('lurker_lounge')}
        style={{ display: 'block', width: '100%', textAlign: 'left' }}
      >
        잘 모르겠어요
      </button>
    </main>
  );
}
