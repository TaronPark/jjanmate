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
import { BookmarkIcon, SettingsIcon, CrownIcon } from '@/components/icons';

type Tab = 'posts' | 'comments' | 'bookmarks' | 'rewards';

const TAB_LABELS: Record<Tab, string> = {
  posts: '게시글',
  comments: '댓글',
  bookmarks: '북마크',
  rewards: '보상·명예',
};

// 마이페이지 4탭 (기획서 12장): 게시글/댓글/북마크/보상명예 + 상단 프로필(유저 플레어 편집).
// 2026-08-02 시안 통일: 시안 화면 4(screen-mypage) profile-header/stats-row 구조로 재작성.
async function getMyStats(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase.from('posts').select('upvote_count, downvote_count').eq('user_id', userId).eq('is_deleted', false),
    supabase.from('comments').select('upvote_count, downvote_count').eq('user_id', userId).eq('is_deleted', false),
  ]);
  const netUpvotes = [...(posts ?? []), ...(comments ?? [])].reduce((sum, r) => sum + (r.upvote_count - r.downvote_count), 0);
  return { postCount: posts?.length ?? 0, commentCount: comments?.length ?? 0, netUpvotes };
}

// 시안은 크라운 아이콘을 항상 노출하지만(정적 목업), 실제로는 "현재 유지 중인 배지가 있는
// 유저"에게만 보여야 의미가 있다. monthly_badges의 가장 최근 year_month(=지난달 정산 결과,
// 이번 달 내내 유지됨)에 내 수상 이력이 있는지로 판단한다.
async function hasActiveBadge(userId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data: latest } = await supabase.from('monthly_badges').select('year_month').order('year_month', { ascending: false }).limit(1).maybeSingle();
  if (!latest) return false;

  const { count } = await supabase
    .from('monthly_badges')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('year_month', latest.year_month);
  return (count ?? 0) > 0;
}

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

  const [rooms, stats, badgeHolder] = await Promise.all([getRooms(), getMyStats(user.id, supabase), hasActiveBadge(user.id, supabase)]);
  const defaultRoomCode = rooms.find((r) => r.id === profile?.default_room_id)?.code ?? DEFAULT_ROOM_CODE;

  return (
    <main style={{ paddingBottom: 72 }}>
      <div className="profile-header" style={{ position: 'relative' }}>
        <Link href="/settings" style={{ position: 'absolute', top: 12, right: 12, display: 'flex', padding: 4 }}>
          <SettingsIcon size={20} color="#333" />
        </Link>

        <div className="profile-name-row">
          {badgeHolder && <CrownIcon size={18} color="#111" />}
          <span className="user-name" style={{ fontSize: 18 }}>
            {profile?.nickname ?? '익명'}
          </span>
          <UserFlairEditor initialFlair={profile?.user_flair ?? null} />
        </div>

        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-num">{stats.postCount}</div>
            <div className="stat-label">작성글</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{stats.commentCount}</div>
            <div className="stat-label">작성 댓글</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{stats.netUpvotes}</div>
            <div className="stat-label">받은 순업보트</div>
          </div>
        </div>

        <Link href="/mypage?tab=rewards&sub=archive" className="btn btn-secondary" style={{ display: 'inline-block', width: 'auto', padding: '8px 16px' }}>
          🏆 배지 보관함
        </Link>
      </div>

      <div className="page-body" style={{ paddingBottom: 0, paddingTop: 0 }}>
        <BadgeCelebrationBanner userId={user.id} />
      </div>

      <div className="tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <Link key={t} href={`/mypage?tab=${t}`} className={`tab${tab === t ? ' active' : ''}`}>
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {tab === 'posts' && <PostsTab userId={user.id} />}
      {tab === 'comments' && <CommentsTab userId={user.id} />}
      {tab === 'bookmarks' && <BookmarksTab userId={user.id} />}
      {tab === 'rewards' && (
        <div className="page-body">
          <RewardsTab userId={user.id} sub={sp.sub} />
        </div>
      )}

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
          <div key={post.id} className="list-item">
            <div className="tag-line" style={{ justifyContent: 'space-between' }}>
              <Link href={`/room/${post.room.code}`} style={{ color: 'var(--text-sub)', textDecoration: 'none' }}>
                [{post.room.name}] [{post.flair.label}]
              </Link>
              {statusLabel && <span className="status-badge">{statusLabel}</span>}
            </div>
            <Link href={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <p className="list-title">{post.title}</p>
            </Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="list-meta">
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
        <div key={c.id} className="list-item">
          <Link href={`/room/${c.room_code}`} style={{ fontSize: 11, color: 'var(--text-sub)', textDecoration: 'none' }}>
            🔗 원글: {c.post_title}
          </Link>
          <p style={{ fontSize: 14, margin: '8px 0' }}>{c.body}</p>
          <span className="list-meta">
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
        <div key={post.id} className="list-item">
          <div className="tag-line" style={{ justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-main)' }}>
              [{post.room.name}] [{post.flair.label}]
            </span>
            <BookmarkButton postId={post.id} initialBookmarked />
          </div>
          <Link href={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <p className="list-title">{post.title}</p>
          </Link>
          <span className="list-meta">
            {getRelativeTimeKo(post.created_at)} · 💬 {post.comment_count} · ↑{post.upvote_count - post.downvote_count}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-sub)', fontSize: 12 }}>
      <BookmarkIcon size={24} color="#ddd" />
      <p style={{ marginTop: 8 }}>{text}</p>
    </div>
  );
}
