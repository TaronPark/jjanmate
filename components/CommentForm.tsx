'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createComment } from '@/app/post/[id]/actions';

interface CommentFormProps {
  postId: string;
  parentCommentId: string | null;
  mentionedNickname: string | null;
  onDone?: () => void;
  autoFocus?: boolean;
}

// 기획서 4-1: 대댓글에 다시 답글을 달면 @멘션이 자동 삽입됨(1-Depth 유지, parentCommentId는
// 항상 호출부에서 "원댓글" id로 정규화해서 넘김).
export default function CommentForm({ postId, parentCommentId, mentionedNickname, onDone, autoFocus }: CommentFormProps) {
  const router = useRouter();
  const [body, setBody] = useState(mentionedNickname ? `@${mentionedNickname} ` : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    const result = await createComment(postId, body, parentCommentId, mentionedNickname);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBody('');
    router.refresh();
    onDone?.();
  };

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentCommentId ? '답글을 입력해주세요' : '댓글을 입력해주세요'}
        autoFocus={autoFocus}
        style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: 'none', background: 'var(--highlight)', borderRadius: 16 }}
      />
      <button onClick={handleSubmit} disabled={submitting || !body.trim()} className="vote-btn">
        등록
      </button>
      {error && <p style={{ color: '#c0392b', fontSize: 11 }}>{error}</p>}
    </div>
  );
}
