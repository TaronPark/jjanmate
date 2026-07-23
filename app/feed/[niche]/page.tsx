import Link from 'next/link';
import { NICHES, type NicheCode } from '@/lib/niches';

// 4-B 재방문 루프 + 2026-07-21 검토 반영: 룸 타이틀/스트릭 상시노출, 상단 상태카드,
// #전체 포함 서브태그 가로스크롤, 원클릭 공감 리액션(cheer/me_too).
// TODO(1~2주차 이후): posts 테이블에서 ai_niche=해당 니치, status='success', is_spam=false 조회로 교체
// TODO(4주차): reactions 테이블 insert/count 연동, 오늘 게시 여부에 따라 상태카드 분기
export default function FeedPage({ params }: { params: { niche: NicheCode } }) {
  const niche = NICHES[params.niche] ?? NICHES.self_catering;

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{niche.roomName}</strong>
        <span style={{ fontSize: 12, color: '#555' }}>🔥 3일 연속</span>
      </div>

      <div className="card" style={{ background: '#e6f1fb' }}>
        <p style={{ fontSize: 12, margin: '0 0 8px' }}>오늘 지출을 아직 기록하지 않았어요!</p>
        <Link href="/post">
          <button style={{ width: '100%' }}>오늘의 절약 기록하기</button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
        <span className="chip">#전체</span>
        <span className="chip">#자취식비</span>
        <span className="chip">#편의점절약</span>
        <span className="chip">#배달비절약</span>
      </div>

      <div className="card">
        <p style={{ fontSize: 13, margin: '0 0 6px' }}>편의점 대신 집밥, 3500원 절약</p>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>방금 전</p>
        <button style={{ fontSize: 11, marginRight: 6 }}>대단해요 12</button>
        <button style={{ fontSize: 11 }}>나도 절약중 8</button>
      </div>
    </main>
  );
}
