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

  return (
    <div
      style={{
        marginLeft: depth === 1 ? 20 : 0,
        marginTop: 8,
        padding: '8px 10px',
        borderRadius: 8,
        background: depth === 1 ? '#fafafa' : '#fff',
        border: comment.is_best ? '1.5px solid #f5a623' : '1px solid #eee',
      }}
    >
      {comment.is_best && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#f5a623', fontWeight: 700, marginBottom: 4 }}>
          <PinnedIcon size={12} color="#f5a623" /> 베스트댓글
        </div>
      )}

      {isCollapsed ? (
        <button
          onClick={() => setCollapsedOverride(false)}
          style={{ width: '100%', textAlign: 'left', fontSize: 12, color: '#999', border: 'none', background: 'none', padding: '4px 0' }}
        >
          비추천이 많은 댓글입니다. (터치해서 펼치기)
        </button>
      ) : (
        <>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>{comment.author_nickname}</span>
            {comment.author_user_flair && (
              <span style={{ marginLeft: 4, padding: '1px 5px', border: '1px solid #ddd', borderRadius: 8, fontSize: 10, color: '#888' }}>
                {comment.author_user_flair}
              </span>
            )}
            <span style={{ marginLeft: 6, color: '#999' }}>· {getRelativeTimeKo(comment.created_at)}</span>
          </div>
          <p style={{ fontSize: 13, margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{comment.body}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <VoteButtons
              targetType="comment"
              targetId={comment.id}
              initialUpvotes={comment.upvote_count}
              initialDownvotes={comment.downvote_count}
              initialMyVote={comment.my_vote}
              voteUpLabel="공감"
              voteDownLabel="비추"
            />
            <button onClick={() => setReplying((v) => !v)} style={{ fontSize: 11, color: '#888', border: 'none', background: 'none' }}>
              답글
            </button>
          </div>
        </>
      )}

      {replying && (
        <CommentForm
          postId={postId}
          parentCommentId={topLevelId}
          mentionedNickname={depth === 1 ? comment.author_nickname : null}
          onDone={() => setReplying(false)}
          autoFocus
        />
      )}

      {depth === 0 &&
        comment.replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} postId={postId} topLevelId={topLevelId} depth={1} />
        ))}
    </div>
  );
}
