import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPostDetail } from '@/lib/feed';
import { getPostComments } from '@/lib/comments';
import { getRelativeTimeKo } from '@/lib/date';
import VoteButtons from '@/components/VoteButtons';
import BookmarkButton from '@/components/BookmarkButton';
import CommentForm from '@/components/CommentForm';
import CommentItem from '@/components/CommentItem';
import AuthorActionButton from '@/components/AuthorActionButton';
import BottomTabBar from '@/components/BottomTabBar';
import { ChevronRightIcon } from '@/components/icons';
import { DEFAULT_ROOM_CODE } from '@/lib/rooms';

// 게시글 상세 (기획서 3-5 카드 상세 확장 + 4장 댓글). 본문 전체 + 투표 + 1-Click 작성자 상태 +
// 1-Depth 스레드 댓글(베스트 고정/접힘 포함).
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const post = await getPostDetail(id, user?.id ?? null);
  if (!post) notFound();

  const comments = await getPostComments(id, user?.id ?? null);
  const statusLabel =
    post.author_action_value === 'a'
      ? post.flair.action_label_a
      : post.author_action_value === 'b'
        ? post.flair.action_label_b
        : null;

  const isAuthor = user?.id === post.user_id;
  const showAuthorAction = isAuthor && post.flair.has_one_click_action && !post.author_action_value;

  return (
    <main style={{ paddingBottom: 72 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <Link href={`/room/${post.room.code}`} style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>
          {post.room.name}
        </Link>
        <ChevronRightIcon size={12} color="#ccc" />
        <span style={{ fontSize: 12, color: '#888' }}>{post.flair.label}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#888' }}>
          <span style={{ color: '#1a1a1a', fontWeight: 600 }}>{post.author_nickname}</span>
          {post.author_user_flair && (
            <span style={{ marginLeft: 4, padding: '1px 6px', border: '1px solid #ddd', borderRadius: 10, fontSize: 10, color: '#888' }}>
              {post.author_user_flair}
            </span>
          )}
          <span style={{ marginLeft: 6 }}>· {getRelativeTimeKo(post.created_at)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {statusLabel && (
            <span className="chip" style={{ background: '#fef3c7', color: '#92400e', fontSize: 10 }}>
              {statusLabel}
            </span>
          )}
          <BookmarkButton postId={post.id} initialBookmarked={post.is_bookmarked} />
        </div>
      </div>

      <h1 style={{ fontSize: 17, margin: '0 0 8px' }}>{post.title}</h1>
      <p style={{ fontSize: 14, color: '#333', whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>{post.body}</p>
      {post.one_line_question && (
        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>{post.one_line_question}</p>
      )}

      {post.image_urls && post.image_urls.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 0 8px' }}>
          {post.image_urls.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`첨부 이미지 ${idx + 1}`}
              style={{ width: 220, aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
            />
          ))}
        </div>
      )}

      {showAuthorAction && post.flair.action_label_a && (
        <AuthorActionButton postId={post.id} actionLabelA={post.flair.action_label_a} actionLabelB={post.flair.action_label_b} />
      )}

      <div style={{ margin: '12px 0', paddingBottom: 12, borderBottom: '1px solid #eee' }}>
        <VoteButtons
          targetType="post"
          targetId={post.id}
          initialUpvotes={post.upvote_count}
          initialDownvotes={post.downvote_count}
          initialMyVote={post.my_vote}
          voteUpLabel={post.flair.vote_up_label}
          voteDownLabel={post.flair.vote_down_label}
          showRatioBar={post.flair.show_ratio_bar}
        />
      </div>

      <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>댓글 {post.comment_count}</h3>
      <CommentForm postId={post.id} parentCommentId={null} mentionedNickname={null} />

      <div style={{ marginTop: 8 }}>
        {comments.length > 0 ? (
          comments.map((c) => <CommentItem key={c.id} comment={c} postId={post.id} topLevelId={c.id} depth={0} />)
        ) : (
          <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '24px 0' }}>첫 댓글을 남겨보세요!</p>
        )}
      </div>

      <BottomTabBar active="room" isLoggedIn={!!user} defaultRoomCode={post.room.code ?? DEFAULT_ROOM_CODE} />
    </main>
  );
}
