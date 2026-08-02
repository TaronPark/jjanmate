'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createComment } from '@/app/post/[id]/actions';

// 시안 화면 5 하단 고정 comment-input-bar 대응. 기존엔 댓글 목록 위에 인라인 CommentForm으로
// 최상위 댓글을 작성했는데, 시안처럼 화면 하단 고정 입력바로 교체(답글 작성은 여전히
// CommentItem 안의 인라인 CommentForm을 재사용 — @멘션 프리필이 필요해 고정바와는 별개).
export default function CommentInputBar({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const result = await createComment(postId, body, null, null);
    setSubmitting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setBody('');
    router.refresh();
  };

  return (
    <div className="comment-input-bar">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="댓글을 입력하세요..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
      />
      <button onClick={handleSubmit} disabled={submitting || !body.trim()}>
        등록
      </button>
    </div>
  );
}
