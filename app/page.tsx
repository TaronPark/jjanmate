import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPopularFeed } from '@/lib/feed';
import { getRooms, DEFAULT_ROOM_CODE } from '@/lib/rooms';
import { getUnreadNotificationCount } from '@/lib/notifications';
import PostCard from '@/components/PostCard';
import BottomTabBar from '@/components/BottomTabBar';
import { BellIcon } from '@/components/icons';

// 1축 인기 피드 (PDF 3-1/3-2 ①) — 앱 진입 최초 랜딩 화면. 로그인 여부와 무관하게 열람 가능
// (구 v1의 "비회원 피드 열람" Must 요건과 동일 원칙 유지). 2026-08-02 피벗으로 기존 랜딩
// 마케팅 카피 페이지를 대체 — "인기 피드를 기본 랜딩 화면으로 제공"(PDF 3-1) 스펙을 그대로 반영.
export default async function PopularFeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [posts, rooms] = await Promise.all([getPopularFeed(user?.id ?? null), getRooms()]);

  let defaultRoomCode = DEFAULT_ROOM_CODE;
  let unreadCount = 0;
  if (user) {
    const [{ data: profile }, count] = await Promise.all([
      supabase.from('profiles').select('default_room_id').eq('id', user.id).maybeSingle(),
      getUnreadNotificationCount(user.id),
    ]);
    const room = profile?.default_room_id ? rooms.find((r) => r.id === profile.default_room_id) : null;
    if (room) defaultRoomCode = room.code;
    unreadCount = count;
  }

  return (
    <main style={{ paddingBottom: 72 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>짠메이트</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <Link href="/notifications" style={{ position: 'relative', display: 'flex' }}>
              <BellIcon size={20} color="#333" />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#e74c3c',
                  }}
                />
              )}
            </Link>
          )}
          {!user && (
            <Link href="/login">
              <button>로그인</button>
            </Link>
          )}
        </div>
      </div>

      <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>🔥 지금 인기 있는 글</h3>

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '40px 0' }}>
          아직 인기 글이 없어요. 첫 글의 주인공이 되어보세요!
        </p>
      )}

      <BottomTabBar active="popular" isLoggedIn={!!user} defaultRoomCode={defaultRoomCode} />
    </main>
  );
}
