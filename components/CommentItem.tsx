'use client';

import { useState } from 'react';
import { getRelativeTimeKo } from '@/lib/date';
import VoteButtons from './VoteButtons';
import CommentForm from './CommentForm';
import { CommentCrownIcon, NavFlameIcon, SproutIcon } from './icons';
import type { CommentNode } from '@/lib/comments';

// 기획서 4-2/4-4: 베스트댓글(+10 이상, 최상단 고정 골드 테두리) / 비추천 누적 댓글 접힘(-5 이하,
// 터치하면 펼침) / 대댓글 답글은 @멘션과 함께 원댓글 밑에 같은 뎁스로 쌓인다(1-Depth 강제).
export default function CommentItem({
  comment,
  postId,
  topLevelId,
  depth,
}: {
  comment: CommentNode;
  postId: string;
  topLevelId: string;
  depth: 0 | 1;
}) {
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const [replying, setReplying] = useState(false);

  const isCollapsed = collapsedOverride ?? comment.is_collapsed;
  const wrapperClass = depth === 1 ? 'reply-item' : 'comment-item';

  if (isCollapsed) {
    return (
      <div className={wrapperClass}>
        <button onClick={() => setCollapsedOverride(false)} className="blind-comment">
          ⚠️ 비추천이 많은 댓글입니다. (클릭하여 보기)
        </button>
      </div>
    );
  }

  const body = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="user-info" style={{ fontSize: 13 }}>
          <span className="user-name">{comment.author_nickname}</span>
          {comment.author_user_flair && <span className="user-flair">{comment.author_user_flair}</span>}
          <span className="time">{getRelativeTimeKo(comment.created_at)}</span>
        </div>
      </div>
      <p style={{ fontSize: 14, margin: '4px 0 8px', whiteSpace: 'pre-wrap', fontWeight: comment.level === 2 ? 700 : 400 }}>
        {comment.body}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <VoteButtons
          targetType="comment"
          targetId={comment.id}
          initialUpvotes={comment.upvote_count}
          initialDownvotes={comment.downvote_count}
          initialMyVote={comment.my_vote}
          voteUpLabel="공감"
          voteDownLabel="비추"
        />
        <button onClick={() => setReplying((v) => !v)} className="vote-btn plain">
          답글
        </button>
      </div>

      {replying && (
        <CommentForm
          postId={postId}
          parentCommentId={topLevelId}
          mentionedNickname={depth === 1 ? comment.author_nickname : null}
          onDone={() => setReplying(false)}
          autoFocus
        />
      )}
    </>
  );

  // 기획서 2-4: Level 1(공감)은 연한 하이라이트 테두리, Level 2(핫댓글)는 텍스트 Bold(위 body에서
  // 처리) + 카드 음영, Level 3(베스트댓글)은 골드 테두리 + 최상단 고정. 색상은 짠메이트 흑백+골드
  // 미니멀 테마를 따라 골드는 Level 3 전용으로 유지하고, 하위 레벨은 회색/검정 톤만 사용한다.
  const badgeWrapperClass = comment.is_best ? 'best-pin' : comment.level === 2 ? 'comment-hot' : comment.level === 1 ? 'comment-sprout' : undefined;

  return (
    <div className={wrapperClass}>
      {badgeWrapperClass ? (
        <div className={badgeWrapperClass}>
          {comment.is_best && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold)', fontWeight: 700, marginBottom: 6 }}>
              <CommentCrownIcon size={12} color="var(--gold)" /> 베스트댓글
            </div>
          )}
          {comment.level === 2 && !comment.is_best && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-main)', fontWeight: 700, marginBottom: 6 }}>
              <NavFlameIcon size={12} color="var(--text-main)" /> 핫댓글
            </div>
          )}
          {comment.level === 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-sub)', fontWeight: 700, marginBottom: 6 }}>
              <SproutIcon size={12} color="var(--text-sub)" /> 공감
            </div>
          )}
          {body}
        </div>
      ) : (
        body
      )}

      {depth === 0 &&
        comment.replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} postId={postId} topLevelId={topLevelId} depth={1} />
        ))}
    </div>
  );
}
