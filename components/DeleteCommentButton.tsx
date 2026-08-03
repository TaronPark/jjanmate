'use client';

import { useRouter } from 'next/navigation';
import { deleteComment } from '@/app/mypage/actions';

// DeletePostButton.tsx와 동일 패턴 — 마이페이지 > 댓글 탭 전용(수정요청사항 2026-08-03 p.7).
export default function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm('이 댓글을 삭제할까요? 삭제하면 되돌릴 수 없어요.');
    if (!confirmed) return;
    const result = await deleteComment(commentId);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <button onClick={handleDelete} style={{ fontSize: 11, color: '#c0392b', border: 'none', background: 'none', padding: 4 }}>
      삭제
    </button>
  );
}
