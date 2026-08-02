import Link from 'next/link';
import { getRelativeTimeKo } from '@/lib/date';
import type { FeedPost } from '@/lib/types';
import VoteButtons from './VoteButtons';
import BookmarkButton from './BookmarkButton';
import { CommentIcon } from './icons';

// 1축 인기 피드 / 2축 룸 피드 공용 메인 피드 카드 (기획서 3-5 레이아웃 통합 스펙 기반, MVP 축약).
// 축약한 부분(추후 보강 대상): 월간 배지(왕관/별) 노출 — 배치 정산 로직 미구현이라 1차 제외.
// 다중 이미지 캐러셀 — 첫 번째 이미지(대표 썸네일)만 표시, 좌우 스와이프는 후속 작업.
export default function PostCard({ post }: { post: FeedPost }) {
  const statusLabel =
    post.author_action_value === 'a'
      ? post.flair.action_label_a
      : post.author_action_value === 'b'
        ? post.flair.action_label_b
        : null;

  return (
    <div className="card" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, color: '#888' }}>
          <span style={{ color: '#1a1a1a', fontWeight: 600 }}>{post.author_nickname}</span>
          {post.author_user_flair && (
            <span
              style={{
                marginLeft: 4,
                padding: '1px 6px',
                border: '1px solid #ddd',
                borderRadius: 10,
                fontSize: 10,
                color: '#888',
              }}
            >
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

      <Link href={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ margin: '6px 0 2px' }}>
          <span className="chip" style={{ fontSize: 10 }}>
            {post.room.name}
          </span>
          <span className="chip" style={{ fontSize: 10 }}>
            {post.flair.label}
          </span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 2px' }}>{post.title}</p>
        <p
          style={{
            fontSize: 13,
            color: '#444',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.body}
        </p>
        {post.one_line_question && (
          <p style={{ fontSize: 13, fontWeight: 600, margin: '6px 0 0' }}>{post.one_line_question}</p>
        )}
        {post.image_urls && post.image_urls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_urls[0]}
            alt="첨부 이미지"
            style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
          />
        )}
      </Link>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <Link
          href={`/post/${post.id}`}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888', textDecoration: 'none' }}
        >
          <CommentIcon size={14} /> 댓글 {post.comment_count}
        </Link>
      </div>

      {post.best_comment && (
        <Link
          href={`/post/${post.id}`}
          style={{
            display: 'block',
            marginTop: 8,
            padding: '6px 8px',
            background: '#fff',
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
