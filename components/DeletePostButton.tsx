'use client';

import { useRouter } from 'next/navigation';
import { deletePost } from '@/app/mypage/actions';

export default function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm('이 게시글을 삭제할까요? 삭제하면 되돌릴 수 없어요.');
    if (!confirmed) return;
    const result = await deletePost(postId);
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
