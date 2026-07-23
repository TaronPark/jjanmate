'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 4-A 4번 + 4-C Labor Illusion: 게시 -> "AI가 읽는 중..." 전환 화면 -> 피드.
// TODO(3주차): handlePost 내부를 실제 posts insert + Claude API 태깅 파이프라인 호출로 교체.
// 지금은 status='pending'으로 insert 후 태깅 결과를 폴링/구독하는 흐름으로 구현 예정 (기획서 6번 참고)
export default function PostPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    setPosting(true);
    // TODO: await supabase.from('posts').insert({ content, status: 'pending', ... })
    setTimeout(() => {
      router.push('/feed/self_catering');
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
      <h3>오늘 얼마 쓰셨나요</h3>
      <textarea
        value={content}
        maxLength={300}
        onChange={(e) => setContent(e.target.value)}
        placeholder="예: 편의점 대신 집밥, 3500원 절약"
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
