'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NICHES, type NicheCode } from '@/lib/niches';

// 4-A 4번 + 4-C Labor Illusion: 게시 -> "AI가 읽는 중..." 전환 화면 -> 피드.
// TODO(3주차): handlePost 내부를 실제 posts insert + Claude API 태깅 파이프라인 호출로 교체.
// 지금은 status='pending'으로 insert 후 태깅 결과를 폴링/구독하는 흐름으로 구현 예정 (기획서 6번 참고)
// 2026-07-24: 어느 룸에서 글을 쓰는지 알아야 4-B 재방문 루프의 입력창 문구(composePrompt) 분기 및
// 게시 후 리다이렉트가 가능해, feed/[niche]에서 ?niche= 쿼리로 현재 룸을 넘겨받도록 변경.
export default function PostPage() {
  const router = useRouter();
  const params = useSearchParams();
  const niche = (params.get('niche') as NicheCode) || 'monthly_rent_fighter';
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    setPosting(true);
    // TODO: await supabase.from('posts').insert({ content, status: 'pending', ... })
    setTimeout(() => {
      router.push(`/feed/${niche}`);
    }, 1200);
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
      <button style={{ width: '100%', marginTop: 8 }} onClick={handlePost} disabled={!content}>
        게시하기
      </button>
    </main>
  );
}
