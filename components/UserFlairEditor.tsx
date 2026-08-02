'use client';

import { useState } from 'react';
import { updateUserFlair } from '@/app/mypage/actions';
import { EditPencilIcon } from './icons';

// 기획서 2-3-1: 프로필 편집 버튼 -> 바텀시트 대신 인라인 입력으로 축약(MVP). 최대 5자,
// 저장 시 서버에서 블랙리스트 검증(lib/blacklist.ts).
export default function UserFlairEditor({ initialFlair }: { initialFlair: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialFlair ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const result = await updateUserFlair(value);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, border: '1px solid var(--border)', borderRadius: 12, padding: '4px 10px', background: '#fff' }}
      >
        <EditPencilIcon size={12} /> {initialFlair ?? '유저 플레어 설정'}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <input
        value={value}
        maxLength={5}
        onChange={(e) => setValue(e.target.value)}
        placeholder="예: 자취3년차"
        style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 8, width: 100 }}
      />
      <button onClick={handleSave} disabled={saving} style={{ fontSize: 11, padding: '4px 8px' }}>
        저장
      </button>
      <button onClick={() => setEditing(false)} style={{ fontSize: 11, padding: '4px 8px' }}>
        취소
      </button>
      {error && <p style={{ color: '#c0392b', fontSize: 10, margin: 0 }}>{error}</p>}
    </div>
  );
}
