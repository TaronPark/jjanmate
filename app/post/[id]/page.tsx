import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPostDetail } from '@/lib/feed';
import { getPostComments } from '@/lib/comments';
import { getRelativeTimeKo } from '@/lib/date';
import VoteButtons from '@/components/VoteButtons';
import BookmarkButton from '@/components/BookmarkButton';
import CommentInputBar from '@/components/CommentInputBar';
import CommentItem from '@/components/CommentItem';
import AuthorActionButton from '@/components/AuthorActionButton';
import ImageCarousel from '@/components/ImageCarousel';
import DetailMoreMenu from '@/components/DetailMoreMenu';
import { ChevronDownIcon, CrownIcon } from '@/components/icons';

// 게시글 상세 (기획서 3-5 카드 상세 확장 + 4장 댓글). 본문 전체 + 투표 + 1-Click 작성자 상태 +
// 1-Depth 스레드 댓글(베스트 고정/접힘 포함).
// 2026-08-02 시안 통일: 시안 화면 5(screen-detail) 구조로 재작성 — 풀스크린 오버레이
// (write-header 스타일 재사용) + detail-post + q-text + 다중이미지 캐러셀 + comment-area +
// best-pin + 하단 고정 comment-input-bar.
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
    <div className="detail-screen">
      <div className="write-header">
        <Link href={`/room/${post.room.code}`} style={{ display: 'flex' }} aria-label="뒤로가기">
          <ChevronDownIcon size={22} color="#111" style={{ transform: 'rotate(90deg)' }} />
        </Link>
        {isAuthor ? <DetailMoreMenu postId={post.id} /> : <span style={{ width: 22 }} />}
      </div>

      <div className="detail-post">
        <div className="post-header">
          <div className="user-info">
            {post.author_has_badge && <CrownIcon size={14} color="#111" />}
            <span className="user-name">{post.author_nickname}</span>
            {post.author_user_flair && <span className="user-flair">{post.author_user_flair}</span>}
            <span className="time">{getRelativeTimeKo(post.created_at)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusLabel && <span className="status-badge">{statusLabel}</span>}
            <BookmarkButton postId={post.id} initialBookmarked={post.is_bookmarked} />
          </div>
        </div>

        <div className="tag-line">
          [{post.room.name}] [{post.flair.label}]
        </div>
        <p className="post-title" style={{ fontSize: 18 }}>
          {post.title}
        </p>
        <p style={{ fontSize: 15, color: '#333', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>{post.body}</p>

        {post.one_line_question && <div className="q-text">❓ &ldquo;{post.one_line_question}&rdquo;</div>}

        {post.image_urls && post.image_urls.length > 0 && <ImageCarousel images={post.image_urls} />}

        {showAuthorAction && post.flair.action_label_a && (
          <AuthorActionButton postId={post.id} actionLabelA={post.flair.action_label_a} actionLabelB={post.flair.action_label_b} />
        )}

        <div style={{ marginTop: 20 }}>
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
      </div>

      <div className="comment-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>💬 댓글 ({post.comment_count})</span>
        </div>

        {comments.length > 0 ? (
          comments.map((c) => <CommentItem key={c.id} comment={c} postId={post.id} topLevelId={c.id} depth={0} />)
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-sub)', textAlign: 'center', padding: '24px 0' }}>첫 댓글을 남겨보세요!</p>
        )}
      </div>

      <CommentInputBar postId={post.id} />
    </div>
  );
}
