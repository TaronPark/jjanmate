import { createClient } from '@/lib/supabase/server';
import { getPopularFeed } from '@/lib/feed';
import { getRooms, DEFAULT_ROOM_CODE } from '@/lib/rooms';
import PostCard from '@/components/PostCard';
import BottomTabBar from '@/components/BottomTabBar';
import AppHeader from '@/components/AppHeader';

// 1축 인기 피드 (PDF 3-1/3-2 ①) — 앱 진입 최초 랜딩 화면. 로그인 여부와 무관하게 열람 가능
// (구 v1의 "비회원 피드 열람" Must 요건과 동일 원칙 유지). 2026-08-02 피벗으로 기존 랜딩
// 마케팅 카피 페이지를 대체 — "인기 피드를 기본 랜딩 화면으로 제공"(PDF 3-1) 스펙을 그대로 반영.
// 2026-08-02 시안 통일: 시안 화면 1(screen-popular) 구조 — 글로벌 헤더 + post-card 리스트로 재작성.
// 2026-08-03 수정요청사항 p.1: 인기 피드는 애초에 "인기순" 단일 정렬만 제공하고 다른 정렬 옵션이
// 없는데 드롭다운처럼 보이는 표시(🔥 인기순 ▾)가 마치 클릭 가능한 정렬 기능처럼 오인을 줘서
// 완전히 제거함(룸 피드의 실제 정렬 드롭다운과 달리 여기는 애초에 대체 정렬 기준 자체가 없음).
export default async function PopularFeedPage() {
  const supabase = await createClient();
  // 로그인 확인과 룸 목록 조회는 서로 무관하므로 병렬 처리(불필요한 순차 왕복 제거).
  const [
    {
      data: { user },
    },
    rooms,
  ] = await Promise.all([supabase.auth.getUser(), getRooms()]);

  const posts = await getPopularFeed(user?.id ?? null);

  let defaultRoomCode = DEFAULT_ROOM_CODE;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('default_room_id').eq('id', user.id).maybeSingle();
    const room = profile?.default_room_id ? rooms.find((r) => r.id === profile.default_room_id) : null;
    if (room) defaultRoomCode = room.code;
  }

  return (
    <main style={{ paddingBottom: 72 }}>
      <AppHeader isLoggedIn={!!user} />

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user?.id ?? null} />)
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-sub)', textAlign: 'center', padding: '40px 16px' }}>
          아직 인기 글이 없어요. 첫 글의 주인공이 되어보세요!
        </p>
      )}

      <BottomTabBar active="popular" isLoggedIn={!!user} defaultRoomCode={defaultRoomCode} />
    </main>
  );
}
