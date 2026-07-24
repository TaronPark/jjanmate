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

  // 2026-07-24 개편: 온보딩 선택지를 페인포인트 행동 문구(onboardingPrompt) 중심으로 재구성.
  // 기존엔 니치 3개 버튼 + 별도 "잘 모르겠어요" 버튼이 있어 눈팅러가 중복 노출됐는데,
  // 눈팅러의 onboardingPrompt("일단 남들 아끼는 거 구경할래요") 자체가 그 역할을 하므로
  // 별도 폴백 버튼은 제거함.
  return (
    <main>
      <h3>지금 어떤 상황이신가요</h3>
      {NICHE_CODES.map((code) => (
        <button
          key={code}
          onClick={() => selectNiche(code)}
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8 }}
        >
          {NICHES[code].onboardingPrompt}{' '}
          <span style={{ color: '#888', fontSize: 12 }}>· {NICHES[code].label}</span>
        </button>
      ))}
    </main>
  );
}
