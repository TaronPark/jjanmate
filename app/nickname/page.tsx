'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { NicheCode } from '@/lib/niches';
import { saveNickname } from './actions';

// 4-A 신규 단계 (2026-07-25 추가): 로그인 직후, 첫 게시 전에 자체 닉네임을 직접 입력받는 화면.
// 판단 근거: 카카오 닉네임/프로필 사진을 그대로 가져오면 소비 실패 인증 같은 민감한 내용이
// 실명·카톡 프로필 사진과 엮여 거부감을 유발할 수 있음(4-C 참고). 짠메이트 내부에서만 쓰는
// 별도 닉네임을 직접 입력받는 쪽이 "무해한 연대" 톤과 마스킹 전략(4-A 3번)과도 일관됨.
// 2026-07-25: 실제 profiles upsert를 Server Action(actions.ts)으로 연동.
// 재방문 유저(이미 profiles 존재)는 이 화면 자체에 도달하지 않음 — app/auth/callback/route.ts가
// 로그인 직후 profiles 존재 여부로 미리 분기해서 여기로는 신규 유저만 들어옴.
function NicknameContent() {
  const router = useRouter();
  const params = useSearchParams();
  const niche = (params.get('niche') as NicheCode) || 'monthly_rent_fighter';
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const result = await saveNickname(nickname, niche);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push(`/post?niche=${niche}`);
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

export default function NicknamePage() {
  return (
    <Suspense fallback={null}>
      <NicknameContent />
    </Suspense>
  );
}
