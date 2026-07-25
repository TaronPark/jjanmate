'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NICHES, type NicheCode } from '@/lib/niches';
import { createPost } from './actions';

// 4-A 4번 + 4-C Labor Illusion: 게시 -> "AI가 읽는 중..." 전환 화면 -> 피드.
// 2026-07-25: 실제 posts insert를 Server Action(actions.ts)으로 연동.
// status/ai_niche는 아직 3주차 AI 파이프라인이 없어 DB 기본값(pending/null) 그대로 저장됨 —
// 즉 지금은 게시해도 ai_niche가 비어있어 feed/[niche] 조회 조건(ai_niche=니치)에 안 걸림.
// 이건 버그가 아니라 3주차 착수 전까지는 정상적인 상태(기획서 6번 AI 태깅 파이프라인 참고).
// Labor Illusion 최소 노출시간: insert가 너무 빨리 끝나면 "AI가 읽는 중..." 화면이 순간
// 깜빡이고 사라져 4-C 설계 근거(Buell & Norton, 2011)가 의도한 체감 효과가 옅어지므로
// 실제 insert와 최소 1.2초 딜레이를 함께 기다림.
function PostContent() {
  const router = useRouter();
  const params = useSearchParams();
  const niche = (params.get('niche') as NicheCode) || 'monthly_rent_fighter';
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const handlePost = async () => {
    setPosting(true);
    setError('');
    const [result] = await Promise.all([
      createPost(content),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
    if (result.error) {
      setError(result.error);
      setPosting(false);
      return;
    }
    router.push(`/feed/${niche}`);
  };

  if (posting) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p>AI가 읽는 중...</p>
      </main>
    );
  }

  return (
    <main>
      <h3>{NICHES[niche].composePrompt}</h3>
      <textarea
        value={content}
        maxLength={300}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`예: ${NICHES[niche].exampleSubtags[0]}로 오늘 지출 방어 성공`}
        style={{ width: '100%', minHeight: 80, padding: 8 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
        <span>사진 첨부</span>
        <span>{content.length}/300</span>
      </div>
      {error && <p style={{ color: '#c0392b', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
      <button style={{ width: '100%', marginTop: 8 }} onClick={handlePost} disabled={!content}>
        게시하기
      </button>
    </main>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={null}>
      <PostContent />
    </Suspense>
  );
}
