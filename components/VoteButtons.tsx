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
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [, startTransition] = useTransition();

  const handleVote = (value: 1 | -1, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={(e) => handleVote(1, e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: myVote === 1 ? '#f5a623' : '#666',
            border: 'none',
            background: 'none',
            padding: 0,
            fontSize: 13,
            fontWeight: myVote === 1 ? 700 : 400,
          }}
        >
          <VoteUpIcon size={15} active={myVote === 1} /> {voteUpLabel} {upvotes}
        </button>
        <button
          onClick={(e) => handleVote(-1, e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: myVote === -1 ? '#3b82f6' : '#666',
            border: 'none',
            background: 'none',
            padding: 0,
            fontSize: 13,
            fontWeight: myVote === -1 ? 700 : 400,
          }}
        >
          <VoteDownIcon size={15} active={myVote === -1} /> {voteDownLabel} {downvotes}
        </button>
      </div>
      {showRatioBar && total > 0 && (
        <div style={{ marginTop: 4, height: 4, width: 120, borderRadius: 2, background: '#eee', overflow: 'hidden' }}>
          <div style={{ width: `${upRatio}%`, height: '100%', background: '#f5a623' }} />
        </div>
      )}
    </div>
  );
}
