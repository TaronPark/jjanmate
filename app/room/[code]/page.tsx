import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRooms, getRoomByCode, getFlairsByRoomId } from '@/lib/rooms';
import { getRoomFeed } from '@/lib/feed';
import PostCard from '@/components/PostCard';
import BottomTabBar from '@/components/BottomTabBar';
import RoomFeedControls from '@/components/RoomFeedControls';
import AppHeader from '@/components/AppHeader';

// 2축 룸 피드 (PDF 3-2 ②). 전체 룸 모아보기는 없고 항상 1개 룸을 지정해야 함.
// 정렬(인기/최신) + 플레어 필터(단일 선택 토글)는 RoomFeedControls(client)가 담당하고,
// 이 서버 컴포넌트는 그 결과 쿼리파라미터를 읽어 Raw Hot Score 정렬 데이터를 가져오기만 한다.
export default async function RoomFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ sort?: string; flair?: string; reset?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  // 룸 조회 + 룸 목록 + 로그인 유저 확인은 서로 의존관계가 없으므로 병렬 처리한다.
  // (이전엔 순차 await 4~5개가 이어져서 룸 드롭다운으로 룸을 바꿀 때마다 Supabase 왕복이
  // 누적되어 체감 지연이 컸음 — 성능 개선 포인트)
  const [room, rooms, {
    data: { user },
  }] = await Promise.all([getRoomByCode(code), getRooms(), supabase.auth.getUser()]);
  if (!room) notFound();

  const flairs = await getFlairsByRoomId(room.id);
  // 수정요청사항(2026-08-03, p.5): 게시글 상세 뒤로가기(?reset=1)로 들어온 경우 플레어는
  // 기억값과 무관하게 항상 '전체'로 고정한다(정렬은 RoomFeedControls가 기억값으로 복원).
  const isReset = sp.reset === '1';
  const sort: 'hot' | 'new' = sp.sort === 'new' ? 'new' : 'hot';
  const activeFlair = !isReset && sp.flair ? flairs.find((f) => f.code === sp.flair) : undefined;
  const hasExplicitParams = sp.sort !== undefined || (sp.flair !== undefined && !isReset);

  const posts = await getRoomFeed(room.id, activeFlair?.id ?? null, sort, user?.id ?? null);

  const writeQuery = new URLSearchParams({ room: room.code });
  if (activeFlair) writeQuery.set('flair', activeFlair.code);

  return (
    <main style={{ paddingBottom: 72 }}>
      <AppHeader isLoggedIn={!!user} writeHref={`/write?${writeQuery.toString()}`} />

      <RoomFeedControls
        rooms={rooms}
        currentRoom={room}
        flairs={flairs}
        sort={sort}
        activeFlairCode={activeFlair?.code ?? null}
        hasExplicitParams={hasExplicitParams}
        forceFlairReset={isReset}
      />

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user?.id ?? null} />)
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-sub)', textAlign: 'center', padding: '40px 16px' }}>
          아직 이 룸에 글이 없어요. 첫 글을 남겨보세요!
        </p>
      )}

      <BottomTabBar
        active="room"
        isLoggedIn={!!user}
        defaultRoomCode={room.code}
        writeHref={`/write?${writeQuery.toString()}`}
      />
    </main>
  );
}
