'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveNickname } from './actions';

// 로그인 직후, 첫 게시 전에 자체 닉네임을 직접 입력받는 화면.
// 2026-08-02 피벗: niche 쿼리파라미터 의존 제거 — 저장 후 인기 피드('/')로 이동.
// 재방문 유저(이미 profiles 존재)는 이 화면 자체에 도달하지 않음 — app/auth/callback/route.ts가
// 로그인 직후 profiles 존재 여부로 미리 분기해서 여기로는 신규 유저만 들어옴.
export default function NicknamePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const result = await saveNickname(nickname);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push('/');
  };

  return (
    <main>
      <h3>짠메이트에서 쓸 닉네임을 정해주세요</h3>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>
        카카오 닉네임과는 별개예요. 여기서만 쓰이는 이름이라 편하게 지어도 괜찮아요.
      </p>
      <input
        value={nickname}
        maxLength={12}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="예: 절약요정, 냉장고파먹기왕"
        style={{ width: '100%', padding: 8, marginBottom: 8 }}
      />
      {error && <p style={{ color: '#c0392b', fontSize: 12, margin: '0 0 8px' }}>{error}</p>}
      <button style={{ width: '100%' }} onClick={handleSubmit} disabled={!nickname.trim() || saving}>
        {saving ? '저장 중...' : '시작하기'}
      </button>
    </main>
  );
}
