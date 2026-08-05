import Link from 'next/link';
import { getRelativeTimeKo } from '@/lib/date';
import type { FeedPost } from '@/lib/types';
import VoteButtons from './VoteButtons';
import BookmarkButton from './BookmarkButton';
import { CommentIcon, CrownIcon } from './icons';
import { getAuthorActionStatusLabel } from '@/lib/flairAction';

// 1축 인기 피드 / 2축 룸 피드 공용 메인 피드 카드 (기획서 3-5 레이아웃 통합 스펙 기반).
// 2026-08-02 시안 통일: 왕관 아이콘은 post.author_has_badge(현재 유지 중인 월간 배지 보유
// 여부, lib/feed.ts 참고)일 때만 표시 — 시안은 항상 노출하는 정적 목업이라 그대로 따르지 않음.
// 남은 축약: 다중 이미지 캐러셀은 피드 카드에서는 대표 썸네일 1장만(상세 화면은 전체 캐러셀 지원).
// 2026-08-03 수정요청사항 p.3: 본인 글에는 본인이 투표/북마크할 수 없다 — currentUserId를 받아
// 작성자 여부를 판단하고 VoteButtons는 비활성화(카운트는 노출), BookmarkButton은 아예 숨긴다.
export default function PostCard({ post, currentUserId = null }: { post: FeedPost; currentUserId?: string | null }) {
  const statusLabel = getAuthorActionStatusLabel(post.flair, post.author_action_value);
  const isAuthor = !!currentUserId && currentUserId === post.user_id;

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="user-info">
          {post.author_has_badge && <CrownIcon size={14} color="#111" />}
          <span className="user-name">{post.author_nickname}</span>
          {post.author_user_flair && <span className="user-flair">{post.author_user_flair}</span>}
          <span className="time">{getRelativeTimeKo(post.created_at)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {statusLabel && <span className="status-badge">{statusLabel}</span>}
          {!isAuthor && <BookmarkButton postId={post.id} initialBookmarked={post.is_bookmarked} />}
        </div>
      </div>

      <Link href={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="tag-line">
          [{post.room.name}] <span className="flair-badge">{post.flair.label}</span>
        </div>
        <p className="post-title">{post.title}</p>
        <p
          className="post-desc"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: post.one_line_question || post.image_urls?.[0] ? 6 : 0,
          }}
        >
          {post.body}
        </p>
        {post.one_line_question && (
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>❓ {post.one_line_question}</p>
        )}
        {post.image_urls && post.image_urls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_urls[0]}
            alt="첨부 이미지"
            style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
          />
        )}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <VoteButtons
          targetType="post"
          targetId={post.id}
          initialUpvotes={post.upvote_count}
          initialDownvotes={post.downvote_count}
          initialMyVote={post.my_vote}
          voteUpLabel={post.flair.vote_up_label}
          voteDownLabel={post.flair.vote_down_label}
          showRatioBar={post.flair.show_ratio_bar}
          disabled={isAuthor}
        />
        <Link href={`/post/${post.id}`} className="vote-btn plain">
          <CommentIcon size={15} /> {post.comment_count}
        </Link>
      </div>

      {post.best_comment && (
        <Link
          href={`/post/${post.id}`}
          style={{
            display: 'block',
            marginTop: 10,
            padding: '8px 10px',
            background: 'var(--highlight)',
            borderRadius: 8,
            fontSize: 12,
            color: '#555',
            textDecoration: 'none',
          }}
        >
          💬 [베댓] {post.best_comment.body.slice(0, 40)}
          {post.best_comment.body.length > 40 ? '…' : ''} (+{post.best_comment.net_upvotes})
        </Link>
      )}
    </div>
  );
}
