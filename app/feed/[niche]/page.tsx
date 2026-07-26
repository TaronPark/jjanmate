import Link from 'next/link';
import { NICHES, type NicheCode } from '@/lib/niches';
import { createClient } from '@/lib/supabase/server';
import { getTodayKst, getYesterdayKst, getRelativeTimeKo } from '@/lib/date';
import ReactionButtons from './ReactionButtons';
import BottomTabBar from '@/components/BottomTabBar';
import FAB from '@/components/FAB';

// 2026-07-26 (UI/UX 개편 스펙 ③) — roomName 데이터(niches.ts)는 그대로 두고, 쉼표로 구분된
// "훅 문구, 룸이름" 형태만 시각적으로 2단 분리해서 모바일에서 줄바꿈이 어색하지 않게 만든다.
// 쉼표가 없는 니치(SNS 지름신 & 홧김비용 방어 룸 등)는 원래 형태 그대로 한 줄로 렌더링.
function RoomTitle({ roomName }: { roomName: string }) {
  const commaIndex = roomName.indexOf(', ');
  if (commaIndex === -1) {
    return (
      <strong style={{ fontSize: 16, lineHeight: 1.3, wordBreak: 'keep-all' }}>{roomName}</strong>
    );
  }
  const hook = roomName.slice(0, commaIndex);
  const room = roomName.slice(commaIndex + 2);
  return (
    <span style={{ display: 'block', lineHeight: 1.3 }}>
      <span style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 400 }}>{hook}</span>
      <strong style={{ display: 'block', fontSize: 16, wordBreak: 'keep-all' }}>{room}</strong>
    </span>
  );
}

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

  // 2026-07-25 (원클릭 공감 리액션): reactions(reaction_type, user_id)를 nested select로 함께
  // 가져와서 별도 집계 쿼리 없이 아래에서 카운트/본인 반응 여부를 계산한다.
  // reactions_select_all이 전체 공개 정책이라 이 방식으로 문제 없음.
  const baseQuery = supabase
    .from('posts')
    .select('id, content, image_url, created_at, ai_niche, status, user_id, profiles(nickname), reactions(reaction_type, user_id)')
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

  // 4주차 스트릭: 로그인 유저의 profiles(current_streak, last_post_date)를 함께 조회해서
  // "유효 스트릭"을 화면에서 파생 계산한다. DB의 current_streak을 그대로 믿지 않는 이유 —
  // 이 값은 유저가 "다음 글을 쓸 때"만 갱신되므로(lib/streak.ts), 스트릭이 끊긴 뒤 다시
  // 글을 쓰기 전까지는 예전 값이 그대로 남아있음. last_post_date가 오늘/어제(KST)가 아니면
  // 화면에는 무조건 0으로 보정 — 이렇게 하면 매일 자정 스트릭을 초기화하는 별도 배치(cron) 없이도
  // 항상 정확한 값을 보여줄 수 있음(2026-07-25 논의).
  const today = getTodayKst();
  const yesterday = getYesterdayKst();

  // onboarding_niche(2026-07-26 추가): 하단 탭바의 [홈] 링크와 FAB의 룸 컨텍스트 없을 때
  // 폴백값으로 쓰인다(UI/UX 개편 스펙 ①·② 참고) — 기존엔 스트릭 계산에만 쓰던 쿼리를 확장.
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('current_streak, last_post_date, onboarding_niche')
        .eq('id', user.id)
        .single()
    : { data: null };

  const postedToday = profile?.last_post_date === today;
  const effectiveStreak =
    profile && (profile.last_post_date === today || profile.last_post_date === yesterday)
      ? profile.current_streak
      : 0;

  // 본인 글인데 아직 정상 분류가 안 된 경우(pending/low_confidence/system_error) 보여줄 안내 문구.
  // 재시도 버튼은 두지 않음 — low_confidence는 기획서상 재시도 대상이 아니고, system_error는
  // 4주차 백그라운드 큐가 처리할 몫이라 유저가 직접 트리거하지 않게 함(2026-07-25 결정).
  const UNCLASSIFIED_LABEL: Record<string, string> = {
    pending: 'AI 분석 대기 중',
    low_confidence: '분류 보류 (확신도가 낮아 미분류)',
    system_error: '일시적 오류로 분류 실패 · 자동 재시도 예정',
  };

  // 2026-07-26 (UI/UX 개편): 홈 탭 링크 대상. 로그인 유저는 본인 온보딩 홈룸, 비회원은
  // 비회원 기본 진입 룸(lurker_lounge, 기획서 5번)으로 고정 — app/page.tsx의 비회원 진입점과 동일.
  const homeNiche: NicheCode = profile?.onboarding_niche ?? 'lurker_lounge';

  return (
    <main style={{ paddingBottom: 72 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <RoomTitle roomName={niche.roomName} />
        {/* 로그인 유저이면서 유효 스트릭이 1 이상일 때만 배지 노출 — 비회원은 애초에 배지 없음,
            로그인했지만 스트릭 0(가입 직후/끊김)인 경우도 "🔥 0일 연속"처럼 어색하게 보이지
            않도록 숨김(2026-07-25 결정) */}
        {user && effectiveStreak > 0 && (
          <span style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>🔥 {effectiveStreak}일 연속</span>
        )}
      </div>
      {/* 2026-07-26: 상단의 "글쓰기"/로그아웃 버튼은 하단 FAB·마이페이지로 이동(UI/UX 개편
          스펙 ①·②) — 헤더는 룸 타이틀/스트릭만 남겨 정보 위계를 정리함(당근마켓/인스타그램
          벤치마킹, docs/짠메이트_프론트엔드_UIUX_개편_스펙.md 참고). 상단 상태 카드의
          "게시하기" 버튼(아래)은 계속 유지되므로, postedToday=true여도 FAB로 언제든 접근 가능. */}

      {notice === 'reclassified' && (
        // 재분류(niche_hint_mismatch) 리다이렉트 직후에만 표시. URL 쿼리 기반이라 새로고침해도
        // 남아있을 수 있음 — 지금은 자동 정리 로직 없이 단순하게 둠(디자인은 나중에, 2026-07-25).
        <div className="card" style={{ background: '#fff8e1' }}>
          <p style={{ fontSize: 12, margin: 0 }}>
            AI 분석 결과 이 글은 <strong>{niche.roomName}</strong>에 더 잘 어울려서 이쪽으로 옮겨드렸어요!
          </p>
        </div>
      )}

      {/* 상단 상태 카드 3분기(2026-07-25): 비회원/로그인+오늘 게시함/로그인+오늘 미게시 */}
      {!user ? (
        <div className="card" style={{ background: '#e6f1fb' }}>
          <p style={{ fontSize: 12, margin: '0 0 8px' }}>로그인하고 동료들과 절약을 시작해보세요!</p>
          <Link href={`/login?niche=${nicheParam}`}>
            <button style={{ width: '100%' }}>로그인하기</button>
          </Link>
        </div>
      ) : postedToday ? (
        <div className="card" style={{ background: '#e6f1fb' }}>
          <p style={{ fontSize: 12, margin: 0 }}>오늘 지출 인증 완료! (스트릭 {effectiveStreak}일차)</p>
        </div>
      ) : (
        <div className="card" style={{ background: '#e6f1fb' }}>
          <p style={{ fontSize: 12, margin: '0 0 8px' }}>오늘 지출을 아직 기록하지 않았어요!</p>
          <Link href={`/post?niche=${nicheParam}`}>
            <button style={{ width: '100%' }}>오늘의 절약 기록하기</button>
          </Link>
        </div>
      )}

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

          const reactions = (post.reactions ?? []) as { reaction_type: string; user_id: string }[];
          const cheerCount = reactions.filter((r) => r.reaction_type === 'cheer').length;
          const meTooCount = reactions.filter((r) => r.reaction_type === 'me_too').length;
          const hasCheered = !!user && reactions.some((r) => r.reaction_type === 'cheer' && r.user_id === user.id);
          const hasMeTooed = !!user && reactions.some((r) => r.reaction_type === 'me_too' && r.user_id === user.id);

          return (
            <div key={post.id} className="card" style={unclassifiedLabel ? { opacity: 0.6 } : undefined}>
              {unclassifiedLabel && (
                <span className="chip" style={{ marginBottom: 6, display: 'inline-block' }}>
                  {unclassifiedLabel}
                </span>
              )}
              <p style={{ fontSize: 13, margin: '0 0 6px' }}>{post.content}</p>
              {post.image_url && (
                // next/image 대신 기본 <img> 사용(2026-07-25 결정) — Vercel 이미지 최적화
                // 한도(월 1000장, Hobby 플랜) 초과를 피하기 위함. object-fit/max-height로
                // 카드 레이아웃이 깨지지 않게만 방어.
                <img
                  src={post.image_url}
                  alt="첨부 이미지"
                  style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
                />
              )}
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>
                {(post.profiles as unknown as { nickname: string } | null)?.nickname ?? '익명'} ·{' '}
                {getRelativeTimeKo(post.created_at)}
              </p>
              <ReactionButtons
                postId={post.id}
                isLoggedIn={!!user}
                initialCheerCount={cheerCount}
                initialMeTooCount={meTooCount}
                initialHasCheered={hasCheered}
                initialHasMeTooed={hasMeTooed}
              />
            </div>
          );
        })
      ) : (
        <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '24px 0' }}>
          아직 이 룸에 올라온 글이 없어요. 첫 글을 남겨보세요!
        </p>
      )}

      {/* 2026-07-26 (UI/UX 개편 스펙 ②): 지금 보고 있는 화면이 이 룸 자체이므로, 홈 탭에서
          들어왔든 둘러보기를 거쳐 들어왔든 상관없이 nicheParam(현재 룸)을 그대로 유지 */}
      {user && <FAB niche={nicheParam} />}
      <BottomTabBar active="home" isLoggedIn={!!user} homeNiche={homeNiche} />
    </main>
  );
}
