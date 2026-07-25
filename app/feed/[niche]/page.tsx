import Link from 'next/link';
import { NICHES, type NicheCode } from '@/lib/niches';
import { createClient } from '@/lib/supabase/server';

// 4-B 재방문 루프 + 2026-07-21 검토 반영: 룸 타이틀/스트릭 상시노출, 상단 상태카드,
// #전체 포함 서브태그 가로스크롤, 원클릭 공감 리액션(cheer/me_too).
// 2026-07-25: 게시글 목록을 posts 테이블 실제 조회로 교체(profiles와 join해 닉네임 노출).
// RLS 정책(posts_select_public_or_own)이 이미 "status='success' AND is_spam=false, 또는
// 본인 글"을 걸러주므로, 이 쿼리는 반드시 SSR 클라이언트(현재 접속자 세션 기준)로 호출해야
// RLS가 그 사람 기준으로 정확히 적용됨 — service_role 키로 조회하면 RLS가 통째로 우회되어
// 스팸/미처리 글까지 샘.
//
// 2026-07-25 (게시 후 상태 피드백): 쿼리를 "ai_niche가 이 룸과 일치" OR "로그인한 나의 글이면서
// 아직 ai_niche가 없음(pending/low_confidence/system_error)"으로 확장. 원래는 ai_niche 필터
// 하나뿐이라 내가 쓴 글이 에러/저신뢰로 끝나면 내 눈에도 영원히 안 보이는 "유령 게시물" 문제가
// 있었음 — RLS가 이미 "본인 글은 항상 조회 가능"을 허용하고 있으므로, 앱 쿼리 쪽 필터만 넓히면
// 됨(보안 경계는 여전히 RLS가 담당, 이 OR는 그 안에서 "보여줄 범위"를 넓히는 것뿐).
// 타인의 pending/low_confidence/system_error 글은 RLS가 그대로 차단하므로 안전함.
export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ niche: NicheCode }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { niche: nicheParam } = await params;
  const { notice } = await searchParams;
  const niche = NICHES[nicheParam] ?? NICHES.monthly_rent_fighter;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseQuery = supabase
    .from('posts')
    .select('id, content, created_at, ai_niche, status, user_id, profiles(nickname)')
    .order('created_at', { ascending: false });

  // 로그인 상태면 "이 룸에 맞는 글 OR 내가 쓴 미분류/에러 글"까지, 비로그인(비회원 열람)이면
  // 지금까지와 동일하게 이 룸으로 분류된 글만.
  const { data: posts, error } = user
    ? await baseQuery.or(`ai_niche.eq.${nicheParam},and(user_id.eq.${user.id},ai_niche.is.null)`)
    : await baseQuery.eq('ai_niche', nicheParam);

  if (error) {
    // 조회 실패 시에도 화면 골격은 유지하고 에러만 조용히 로그 — 피드 자체가 죽으면 안 됨
    console.error('피드 조회 실패:', error.message);
  }

  // 본인 글인데 아직 정상 분류가 안 된 경우(pending/low_confidence/system_error) 보여줄 안내 문구.
  // 재시도 버튼은 두지 않음 — low_confidence는 기획서상 재시도 대상이 아니고, system_error는
  // 4주차 백그라운드 큐가 처리할 몫이라 유저가 직접 트리거하지 않게 함(2026-07-25 결정).
  const UNCLASSIFIED_LABEL: Record<string, string> = {
    pending: 'AI 분석 대기 중',
    low_confidence: '분류 보류 (확신도가 낮아 미분류)',
    system_error: '일시적 오류로 분류 실패 · 자동 재시도 예정',
  };

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{niche.roomName}</strong>
        <span style={{ fontSize: 12, color: '#555' }}>🔥 3일 연속</span>
      </div>

      {notice === 'reclassified' && (
        // 재분류(niche_hint_mismatch) 리다이렉트 직후에만 표시. URL 쿼리 기반이라 새로고침해도
        // 남아있을 수 있음 — 지금은 자동 정리 로직 없이 단순하게 둠(디자인은 나중에, 2026-07-25).
        <div className="card" style={{ background: '#fff8e1' }}>
          <p style={{ fontSize: 12, margin: 0 }}>
            AI 분석 결과 이 글은 <strong>{niche.roomName}</strong>에 더 잘 어울려서 이쪽으로 옮겨드렸어요!
          </p>
        </div>
      )}

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
        posts.map((post) => {
          // ai_niche가 null이면서 이 목록에 떠 있다는 건 위 쿼리 설계상 "내가 쓴 미분류/에러 글"뿐
          // (RLS가 타인의 그런 글은 애초에 안 돌려줌) — status 기준으로 안내 뱃지를 붙인다.
          const unclassifiedLabel = post.status !== 'success' ? UNCLASSIFIED_LABEL[post.status] : null;
          return (
            <div key={post.id} className="card" style={unclassifiedLabel ? { opacity: 0.6 } : undefined}>
              {unclassifiedLabel && (
                <span className="chip" style={{ marginBottom: 6, display: 'inline-block' }}>
                  {unclassifiedLabel}
                </span>
              )}
              <p style={{ fontSize: 13, margin: '0 0 6px' }}>{post.content}</p>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>
                {(post.profiles as unknown as { nickname: string } | null)?.nickname ?? '익명'} ·{' '}
                {new Date(post.created_at).toLocaleString('ko-KR')}
              </p>
              <button style={{ fontSize: 11, marginRight: 6 }}>대단해요</button>
              <button style={{ fontSize: 11 }}>나도 절약중</button>
            </div>
          );
        })
      ) : (
        <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '24px 0' }}>
          아직 이 룸에 올라온 글이 없어요. 첫 글을 남겨보세요!
        </p>
      )}
    </main>
  );
}
