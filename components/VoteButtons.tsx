'use client';

import { useState, useTransition } from 'react';
import { castVote } from '@/app/votes/actions';
import { VoteUpIcon, VoteDownIcon } from './icons';
import type { VoteTargetType } from '@/lib/types';

interface VoteButtonsProps {
  targetType: VoteTargetType;
  targetId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialMyVote: 1 | -1 | 0;
  voteUpLabel: string;
  voteDownLabel: string;
  showRatioBar?: boolean;
  // 수정요청사항(2026-08-03, p.3/p.6): 본인 글/댓글에는 본인이 투표할 수 없다. 카운트는 그대로
  // 보여주되 클릭만 막는 방식(숨김이 아님)으로, 서버 액션의 자기투표 차단과 짝을 이룬다.
  disabled?: boolean;
}

// 기획서 2-1/2-2: 플레어별 동적 업/다운보트 문구 + (투표형 4종에 한해) 실시간 % 비율 바.
// 낙관적 UI(Optimistic Update) + 실패 시 롤백 — 기존 ReactionButtons(리액션, v1)와 동일한
// 패턴을 업다운보트 3상태(+1/0/-1)로 확장.
export default function VoteButtons({
  targetType,
  targetId,
  initialUpvotes,
  initialDownvotes,
  initialMyVote,
  voteUpLabel,
  voteDownLabel,
  showRatioBar,
  disabled,
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [, startTransition] = useTransition();

  const handleVote = (value: 1 | -1, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    const prevUp = upvotes;
    const prevDown = downvotes;
    const prevMy = myVote;

    let nextUp = upvotes;
    let nextDown = downvotes;
    let nextMy: 1 | -1 | 0;

    if (myVote === value) {
      nextMy = 0;
      if (value === 1) nextUp -= 1;
      else nextDown -= 1;
    } else if (myVote === 0) {
      nextMy = value;
      if (value === 1) nextUp += 1;
      else nextDown += 1;
    } else {
      nextMy = value;
      if (value === 1) {
        nextUp += 1;
        nextDown -= 1;
      } else {
        nextDown += 1;
        nextUp -= 1;
      }
    }

    setUpvotes(nextUp);
    setDownvotes(nextDown);
    setMyVote(nextMy);

    startTransition(async () => {
      const result = await castVote(targetType, targetId, value);
      if (result.error) {
        setUpvotes(prevUp);
        setDownvotes(prevDown);
        setMyVote(prevMy);
        if (result.error === '로그인이 필요합니다.') {
          alert('로그인이 필요한 기능이에요.');
        }
      }
    });
  };

  const total = upvotes + downvotes;
  const upRatio = total > 0 ? Math.round((upvotes / total) * 100) : 50;

  return (
    <div>
      <div className="reaction-bar">
        <button
          onClick={(e) => handleVote(1, e)}
          className={`vote-btn${myVote === 1 ? ' active' : ''}`}
          disabled={disabled}
          style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
        >
          <VoteUpIcon size={14} active={myVote === 1} /> {voteUpLabel} {upvotes}
        </button>
        <button
          onClick={(e) => handleVote(-1, e)}
          className={`vote-btn${myVote === -1 ? ' active' : ''}`}
          disabled={disabled}
          style={disabled ? { opacity: 0.5, cursor: 'default' } : undefined}
        >
          <VoteDownIcon size={14} active={myVote === -1} /> {voteDownLabel} {downvotes}
        </button>
      </div>
      {showRatioBar && total > 0 && (
        <div className="vote-ratio-bar">
          <div className="vote-ratio-fill" style={{ width: `${upRatio}%` }} />
        </div>
      )}
    </div>
  );
}
