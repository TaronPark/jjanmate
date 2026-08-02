'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthorAction } from '@/app/post/[id]/actions';

interface AuthorActionButtonProps {
  postId: string;
  actionLabelA: string;
  actionLabelB: string | null;
}

// 기획서 2-3: 글쓴이 1-Click 액션. 투표형 플레어 4종에 한정, 상태는 한 번 정하면 되돌릴 수 없음.
// 룸 제안 플레어처럼 단일 옵션(actionLabelB=null)인 경우 버튼 1개만 노출.
export default function AuthorActionButton({ postId, actionLabelA, actionLabelB }: AuthorActionButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async (value: 'a' | 'b') => {
    setSubmitting(true);
    const result = await setAuthorAction(postId, value);
    setSubmitting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
      <button
        onClick={() => handleClick('a')}
        disabled={submitting}
        style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #f5a623', background: '#fff7ed', color: '#c2410c', fontSize: 13 }}
      >
        {actionLabelA}
      </button>
      {actionLabelB && (
        <button
          onClick={() => handleClick('b')}
          disabled={submitting}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#555', fontSize: 13 }}
        >
          {actionLabelB}
        </button>
      )}
    </div>
  );
}
