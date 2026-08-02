'use client';

import { useState } from 'react';
import { getRelativeTimeKo } from '@/lib/date';
import VoteButtons from './VoteButtons';
import CommentForm from './CommentForm';
import { PinnedIcon } from './icons';
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
      <p style={{ fontSize: 14, margin: '4px 0 8px', whiteSpace: 'pre-wrap' }}>{comment.body}</p>
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

  return (
    <div className={wrapperClass}>
      {comment.is_best ? (
        <div className="best-pin">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gold)', fontWeight: 700, marginBottom: 6 }}>
            <PinnedIcon size={12} color="var(--gold)" /> 베스트댓글
          </div>
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
