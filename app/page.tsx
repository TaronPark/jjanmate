import { createClient } from '@/lib/supabase/server';
import { getPopularFeed } from '@/lib/feed';
import { getRooms, DEFAULT_ROOM_CODE } from '@/lib/rooms';
import PostCard from '@/components/PostCard';
import BottomTabBar from '@/components/BottomTabBar';
import AppHeader from '@/components/AppHeader';
import { ChevronDownIcon } from '@/components/icons';

// 1축 인기 피드 (PDF 3-1/3-2 ①) — 앱 진입 최초 랜딩 화면. 로그인 여부와 무관하게 열람 가능
// (구 v1의 "비회원 피드 열람" Must 요건과 동일 원칙 유지). 2026-08-02 피벗으로 기존 랜딩
// 마케팅 카피 페이지를 대체 — "인기 피드를 기본 랜딩 화면으로 제공"(PDF 3-1) 스펙을 그대로 반영.
// 2026-08-02 시안 통일: 시안 화면 1(screen-popular) 구조 — 글로벌 헤더 + filter-bar(인기순
// 드롭다운, 현재는 표시만) + post-card 리스트로 재작성. 알림 진입점은 헤더 더보기 드로어로 이동.
export default async function PopularFeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [posts, rooms] = await Promise.all([getPopularFeed(user?.id ?? null), getRooms()]);

  let defaultRoomCode = DEFAULT_ROOM_CODE;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('default_room_id').eq('id', user.id).maybeSingle();
    const room = profile?.default_room_id ? rooms.find((r) => r.id === profile.default_room_id) : null;
    if (room) defaultRoomCode = room.code;
  }

  return (
    <main style={{ paddingBottom: 72 }}>
      <AppHeader isLoggedIn={!!user} />

      <div className="filter-bar">
        <div className="dropdown">
          🔥 인기순 <ChevronDownIcon size={14} />
        </div>
      </div>

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-sub)', textAlign: 'center', padding: '40px 16px' }}>
          아직 인기 글이 없어요. 첫 글의 주인공이 되어보세요!
        </p>
      )}

      <BottomTabBar active="popular" isLoggedIn={!!user} defaultRoomCode={defaultRoomCode} />
    </main>
  );
}
