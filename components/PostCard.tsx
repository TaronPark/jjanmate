import Link from 'next/link';
import { getRelativeTimeKo } from '@/lib/date';
import type { FeedPost } from '@/lib/types';
import VoteButtons from './VoteButtons';
import BookmarkButton from './BookmarkButton';
import ImageCarousel from './ImageCarousel';
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
        {/* 수정요청사항(2026-08-05, p.5-6 ①): 룸/플레어를 별도 줄이 아니라 닉네임·게시시간과
            같은 줄에 작게 배치 — 개인 유저플레어(author_user_flair)와 구분하기 위해 룸 이름은
            텍스트로, 게시글 플레어는 flair-badge로 표시한다. */}
        <div className="user-info">
          {post.author_has_badge && <CrownIcon size={14} color="#111" />}
          <span className="user-name">{post.author_nickname}</span>
          {post.author_user_flair && <span className="user-flair">{post.author_user_flair}</span>}
          <span style={{ color: 'var(--text-sub)', fontSize: 11 }}>[{post.room.name}]</span>
          <span className="flair-badge">{post.flair.label}</span>
          <span className="time">{getRelativeTimeKo(post.created_at)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {statusLabel && <span className="status-badge">{statusLabel}</span>}
          {!isAuthor && <BookmarkButton postId={post.id} initialBookmarked={post.is_bookmarked} />}
        </div>
      </div>

      <Link href={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <p className="post-title">{post.title}</p>
        <p
          className="post-desc"
          style={{
            display: '-webkit-box',
            // 수정요청사항 p.5-6 ③: 클릭 전 미리보기를 2줄→6줄로 확대(참고 의견 반영, 사용자 확정).
            WebkitLineClamp: 6,
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
        {/* 수정요청사항 p.5-6 ②: 클릭 없이도 좌우로 넘겨 첨부 이미지를 모두 볼 수 있도록
            대표 이미지 1장 노출 대신 ImageCarousel(상세 화면과 동일 컴포넌트)을 재사용한다. */}
        {post.image_urls && post.image_urls.length > 0 && <ImageCarousel images={post.image_urls} />}
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
