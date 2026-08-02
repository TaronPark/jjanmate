import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyPosts, getBookmarkedPosts } from '@/lib/feed';
import { getMyComments } from '@/lib/comments';
import { getRelativeTimeKo } from '@/lib/date';
import { getRooms, DEFAULT_ROOM_CODE } from '@/lib/rooms';
import BottomTabBar from '@/components/BottomTabBar';
import UserFlairEditor from '@/components/UserFlairEditor';
import DeletePostButton from '@/components/DeletePostButton';
import BookmarkButton from '@/components/BookmarkButton';
import RewardsTab from '@/components/RewardsTab';
import BadgeCelebrationBanner from '@/components/BadgeCelebrationBanner';
import { BookmarkIcon, SettingsIcon } from '@/components/icons';

type Tab = 'posts' | 'comments' | 'bookmarks' | 'rewards';

const TAB_LABELS: Record<Tab, string> = {
  posts: '게시글',
  comments: '댓글',
  bookmarks: '북마크',
  rewards: '보상·명예',
};

// 마이페이지 4탭 (기획서 12장): 게시글/댓글/북마크/보상명예 + 상단 프로필(유저 플레어 편집).
// 2026-08-02 피벗: 니치/스트릭 프로필 지표를 유저 플레어 편집 UI로 대체.
export default async function MyPage({ searchParams }: { searchParams: Promise<{ tab?: string; sub?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('nickname, user_flair, default_room_id').eq('id', user.id).single();

  const sp = await searchParams;
  const tab: Tab = (['posts', 'comments', 'bookmarks', 'rewards'] as Tab[]).includes(sp.tab as Tab)
    ? (sp.tab as Tab)
    : 'posts';

  const rooms = await getRooms();
  const defaultRoomCode = rooms.find((r) => r.id === profile?.default_room_id)?.code ?? DEFAULT_ROOM_CODE;

  return (
    <main style={{ paddingBottom: 72 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <strong style={{ fontSize: 16 }}>{profile?.nickname ?? '익명'}</strong>
          <div style={{ marginTop: 4 }}>
            <UserFlairEditor initialFlair={profile?.user_flair ?? null} />
          </div>
        </div>
        <Link href="/settings" style={{ display: 'flex', padding: 4 }}>
          <SettingsIcon size={20} color="#333" />
        </Link>
      </div>

      <BadgeCelebrationBanner userId={user.id} />

      <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: 12 }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={`/mypage?tab=${t}`}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px 0',
              fontSize: 12,
              textDecoration: 'none',
              color: tab === t ? '#f5a623' : '#888',
              fontWeight: tab === t ? 700 : 400,
              borderBottom: tab === t ? '2px solid #f5a623' : '2px solid transparent',
            }}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {tab === 'posts' && <PostsTab userId={user.id} />}
      {tab === 'comments' && <CommentsTab userId={user.id} />}
      {tab === 'bookmarks' && <BookmarksTab userId={user.id} />}
      {tab === 'rewards' && <RewardsTab userId={user.id} sub={sp.sub} />}

      <BottomTabBar active="mypage" isLoggedIn defaultRoomCode={defaultRoomCode} />
    </main>
  );
}

async function PostsTab({ userId }: { userId: string }) {
  const posts = await getMyPosts(userId);
  if (posts.length === 0) {
    return <EmptyState text="아직 작성한 글이 없어요." />;
  }
  return (
    <div>
      {posts.map((post) => {
        const statusLabel =
          post.author_action_value === 'a'
            ? post.flair.action_label_a
            : post.author_action_value === 'b'
              ? post.flair.action_label_b
              : null;
        return (
          <div key={post.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link href={`/room/${post.room.code}`} style={{ fontSize: 11, color: '#888', textDecoration: 'none' }}>
                {post.room.name} · {post.flair.label}
              </Link>
              {statusLabel && (
                <span className="chip" style={{ fontSize: 10, background: '#fef3c7', color: '#92400e' }}>
                  {statusLabel}
                </span>
              )}
            </div>
            <Link href={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '6px 0 2px' }}>{post.title}</p>
            </Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: '#888' }}>
                {getRelativeTimeKo(post.created_at)} · ↑{post.upvote_count - post.downvote_count} · 댓글 {post.comment_count}
              </span>
              <DeletePostButton postId={post.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function CommentsTab({ userId }: { userId: string }) {
  const comments = await getMyComments(userId);
  if (comments.length === 0) {
    return <EmptyState text="아직 작성한 댓글이 없어요." />;
  }
  return (
    <div>
      {comments.map((c) => (
        <div key={c.id} className="card">
          <Link href={`/room/${c.room_code}`} style={{ fontSize: 11, color: '#888', textDecoration: 'none' }}>
            🔗 원글: {c.post_title}
          </Link>
          <p style={{ fontSize: 13, margin: '6px 0 4px' }}>{c.body}</p>
          <span style={{ fontSize: 11, color: '#888' }}>
            {getRelativeTimeKo(c.created_at)} · ↑{c.upvote_count - c.downvote_count}
          </span>
        </div>
      ))}
    </div>
  );
}

async function BookmarksTab({ userId }: { userId: string }) {
  const posts = await getBookmarkedPosts(userId);
  if (posts.length === 0) {
    return <EmptyState text="아직 북마크한 글이 없어요." />;
  }
  return (
    <div>
      {posts.map((post) => (
        <div key={post.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Link href={`/room/${post.room.code}`} style={{ fontSize: 11, color: '#888', textDecoration: 'none', marginRight: 6 }}>
                {post.room.name}
              </Link>
              <Link href={`/room/${post.room.code}?flair=${post.flair.code}`} style={{ fontSize: 11, color: '#888', textDecoration: 'none' }}>
                {post.flair.label}
              </Link>
            </div>
            <BookmarkButton postId={post.id} initialBookmarked />
          </div>
          <Link href={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '6px 0 2px' }}>{post.title}</p>
          </Link>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888', fontSize: 12 }}>
      <BookmarkIcon size={24} color="#ddd" />
      <p style={{ marginTop: 8 }}>{text}</p>
    </div>
  );
}
