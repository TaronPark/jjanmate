import Link from 'next/link';
import { NICHES, NICHE_CODES } from '@/lib/niches';

// 4-A 1번: 비회원 랜딩. 로그인 없이 니치별 인증글 미리보기 노출.
// TODO(1~2주차): 아래 더미 카드를 실제 posts 테이블 조회(성공 처리된 글, 최신순)로 교체
export default function LandingPage() {
  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>짠메이트</strong>
        <Link href="/login">
          <button>로그인</button>
        </Link>
      </div>

      <div style={{ margin: '12px 0' }}>
        {NICHE_CODES.map((code) => (
          <span key={code} className="chip">
            {NICHES[code].label}
          </span>
        ))}
      </div>

      <div className="card">
        <p style={{ fontSize: 13, margin: 0 }}>오늘 편의점 대신 집밥, 3500원 절약</p>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>자취식비 · 5분 전</p>
      </div>
      <div className="card">
        <p style={{ fontSize: 13, margin: 0 }}>무지출 12일차 성공</p>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>무지출챌린지 · 20분 전</p>
      </div>

      <Link href="/onboarding">
        <button style={{ width: '100%', marginTop: 12 }}>나와 같은 상황인 사람 찾기 →</button>
      </Link>
    </main>
  );
}
