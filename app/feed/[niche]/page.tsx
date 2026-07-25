import Link from 'next/link';
import { NICHES, type NicheCode } from '@/lib/niches';
import { createClient } from '@/lib/supabase/server';

// 4-B 재방문 루프 + 2026-07-21 검토 반영: 룸 타이틀/스트릭 상시노출, 상단 상태카드,
// #전체 포함 서브태그 가로스크롤, 원클릭 공감 리액션(cheer/me_too).
// 2026-07-25: 게시글 목록을 posts 테이블 실제 조회로 교체(profiles와 join해 닉네임 노출).
// RLS 정책(posts_select_public_or_own)이 이미 "status='success' AND is_spam=false, 또는
// 본인 글"을 걸러주므로, 여기서는 니치 필터(ai_niche=params.niche)만 명시하면 됨.
// 이 쿼리는 반드시 SSR 클라이언트(현재 접속자 세션 기준)로 호출해야 RLS가 그 사람 기준으로
// 정확히 적용됨 — service_role 키로 조회하면 RLS가 통째로 우회되어 스팸/미처리 글까지 샘.
//
// 주의: 3주차 AI 태깅 파이프라인이 아직 없어 ai_niche는 항상 null인 상태 —
// 즉 지금은 글을 써도 이 피드에 안 뜨는 게 정상(버그 아님). 3주차 착수 후 채워짐.
//
// TODO(4주차): reactions 테이블 insert/count 연동, 오늘 게시 여부에 따라 상태카드 분기
// TODO(디자인 확정 후, 런칭 이후 백로그): 룸 타이틀 시각적 강조 — 2026-07-24 전략검토에서
// "여기는 우리만의 안전한 방"이라는 소속감을 UI로 더 강화할 필요가 제기됨(폰트/아이콘 등).
// 구체 스타일은 아직 미확정이라 지금은 일부러 손대지 않음 — 로드맵 "런칭 이후" 섹션 참고.
export default async function FeedPage({ params }: { params: Promise<{ niche: NicheCode }> }) {
  const { niche: nicheParam } = await params;
  const niche = NICHES[nicheParam] ?? NICHES.monthly_rent_fighter;

  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, content, created_at, profiles(nickname)')
    .eq('ai_niche', nicheParam)
    .order('created_at', { ascending: false });

  if (error) {
    // 조회 실패 시에도 화면 골격은 유지하고 에러만 조용히 로그 — 피드 자체가 죽으면 안 됨
    console.error('피드 조회 실패:', error.message);
  }

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{niche.roomName}</strong>
        <span style={{ fontSize: 12, color: '#555' }}>🔥 3일 연속</span>
      </div>

      <div className="card" style={{ background: '#e6f1fb' }}>
        <p style={{ fontSize: 12, margin: '0 0 8px' }}>오늘 지출을 아직 기록하지 않았어요!</p>
        <Link href={`/post?niche=${nicheParam}`}>
          <button style={{ width: '100%' }}>오늘의 절약 기록하기</button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
        <span className="chip">#전체</span>
        {niche.exampleSubtags.map((tag) => (
          <span key={tag} className="chip">
            #{tag}
          </span>
        ))}
      </div>

      {posts && posts.length > 0 ? (
        posts.map((post) => (
          <div key={post.id} className="card">
            <p style={{ fontSize: 13, margin: '0 0 6px' }}>{post.content}</p>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>
              {(post.profiles as unknown as { nickname: string } | null)?.nickname ?? '익명'} ·{' '}
              {new Date(post.created_at).toLocaleString('ko-KR')}
            </p>
            <button style={{ fontSize: 11, marginRight: 6 }}>대단해요</button>
            <button style={{ fontSize: 11 }}>나도 절약중</button>
          </div>
        ))
      ) : (
        <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '24px 0' }}>
          아직 이 룸에 올라온 글이 없어요. 첫 글을 남겨보세요!
        </p>
      )}
    </main>
  );
}
