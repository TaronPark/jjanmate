'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deletePost } from '@/app/mypage/actions';
import { MoreVerticalIcon, TrashIcon } from './icons';

// 시안 화면 5 헤더 우측 "더보기" 아이콘 대응. 글쓴이에게만 노출되며, 현재는 삭제 메뉴 하나만
// 연결(수정 기능은 아직 없음 — MVP 범위 밖).
export default function DetailMoreMenu({ postId }: { postId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm('이 게시글을 삭제할까요? 삭제하면 되돌릴 수 없어요.');
    if (!confirmed) return;
    const result = await deletePost(postId);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.push('/');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button className="header-icon" onClick={() => setOpen((v) => !v)} aria-label="더보기">
        <MoreVerticalIcon size={22} color="#111" />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 0,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 30,
            minWidth: 100,
          }}
        >
          <button
            onClick={handleDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              background: 'none',
              color: '#c0392b',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <TrashIcon size={14} color="#c0392b" /> 삭제
          </button>
        </div>
      )}
    </div>
  );
}
