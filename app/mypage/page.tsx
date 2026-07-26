import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTodayKst, getYesterdayKst, getRelativeTimeKo } from '@/lib/date';
import type { NicheCode } from '@/lib/niches';
import BottomTabBar from '@/components/BottomTabBar';
import FAB from '@/components/FAB';
import LogoutButton from '@/components/LogoutButton';

// 2026-07-26 (UI/UX 개편 스펙 ①) — 하단 탭바의 [마이페이지]. 닉네임/유효 스트릭/본인 작성
// 글 전체 목록(미분류 포함)/로그아웃 버튼. 비회원은 URL을 직접 열어도 로그인 화면으로 리다이렉트
// (탭바 클릭 시 확인창으로 유도하는 것과 별개로, 직접 접근에 대한 방어선).
//
// "내가 작성한 글 목록"은 status='success'만이 아니라 low_confidence/system_error도 전체
// 포함하고, 지금 피드(app/feed/[niche]/page.tsx)와 동일하게 반투명+상태 배지로 노출한다 —
// 유저가 자신의 글 상태를 직접 인지할 수 있게 하기 위함(사용자 명시적 요청, 2026-07-26).
const UNCLASSIFIED_LABEL: Record<string, string> = {
  pending: 'AI 분석 대기 중',
  low_confidence: '분류 보류 (확신도가 낮아 미분류)',
  system_error: '일시적 오류로 분류 실패 · 자동 재시도 예정',
};

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, current_streak, last_post_date, onboarding_niche')
    .eq('id', user.id)
    .single();

  const today = getTodayKst();
  const yesterday = getYesterdayKst();
  const effectiveStreak =
    profile && (profile.last_post_date === today || profile.last_post_date === yesterday)
      ? profile.current_streak
      : 0;

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, content, image_url, created_at, ai_niche, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('마이페이지 글 목록 조회 실패:', error.message);
  }

  const homeNiche: NicheCode = profile?.onboarding_niche ?? 'monthly_rent_fighter';

  return (
    <main style={{ paddingBottom: 72 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <strong style={{ fontSize: 16 }}>{profile?.nickname ?? '익명'}</strong>
        <LogoutButton />
      </div>
      {effectiveStreak > 0 && (
        <p style={{ fontSize: 12, color: '#555', margin: '0 0 16px' }}>🔥 {effectiveStreak}일 연속</p>
      )}

      <h3 style={{ fontSize: 13, margin: '8px 0' }}>내가 쓴 글</h3>

      {posts && posts.length > 0 ? (
        posts.map((post) => {
          const unclassifiedLabel = post.status !== 'success' ? UNCLASSIFIED_LABEL[post.status] : null;
          return (
            <div key={post.id} className="card" style={unclassifiedLabel ? { opacity: 0.6 } : undefined}>
              {unclassifiedLabel && (
                <span className="chip" style={{ marginBottom: 6, display: 'inline-block' }}>
                  {unclassifiedLabel}
                </span>
              )}
              <p style={{ fontSize: 13, margin: '0 0 6px' }}>{post.content}</p>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="첨부 이미지"
                  style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
                />
              )}
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{getRelativeTimeKo(post.created_at)}</p>
            </div>
          );
        })
      ) : (
        <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '24px 0' }}>
          아직 작성한 글이 없어요.
        </p>
      )}

      <FAB niche={homeNiche} />
      <BottomTabBar active="mypage" isLoggedIn homeNiche={homeNiche} />
    </main>
  );
}
