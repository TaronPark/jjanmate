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

      {/* 랜딩 헤드카피 (2026-07-24 니치 개편 반영, 최종 확정본) */}
      <h1 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, margin: '16px 0 4px' }}>
        숨막히는 월세도, 못 참은 홧김비용도. 내 맘 가장 잘 아는 동료들끼리.
      </h1>
      <p style={{ fontSize: 13, color: '#555', margin: '0 0 16px' }}>
        맥락 없이 혼나기만 하는 거지방에 지치셨나요? 내 소비 고민과 똑 닮은 동료들이 모인 아지트로 오세요.
      </p>

      <div style={{ margin: '12px 0' }}>
        {NICHE_CODES.map((code) => (
          <span key={code} className="chip">
            {NICHES[code].label}
          </span>
        ))}
      </div>

      <div className="card">
        <p style={{ fontSize: 13, margin: 0 }}>보일러 외출모드로 이번 달 관리비 2만원 방어</p>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>월세독립군 · 5분 전</p>
      </div>
      <div className="card">
        <p style={{ fontSize: 13, margin: 0 }}>인스타템 방어 성공, 장바구니 비우고 잠들기</p>
        <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>홧김비용방어 · 20분 전</p>
      </div>

      <Link href="/onboarding">
        <button style={{ width: '100%', marginTop: 12 }}>나와 같은 상황인 사람 찾기 →</button>
      </Link>
    </main>
  );
}
