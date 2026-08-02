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
  searchParams: Promise<{ sort?: string; flair?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;

  const [room, rooms] = await Promise.all([getRoomByCode(code), getRooms()]);
  if (!room) notFound();

  const flairs = await getFlairsByRoomId(room.id);
  const sort: 'hot' | 'new' = sp.sort === 'new' ? 'new' : 'hot';
  const activeFlair = sp.flair ? flairs.find((f) => f.code === sp.flair) : undefined;
  const hasExplicitParams = sp.sort !== undefined || sp.flair !== undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      />

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
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
