import type { PostFlair } from './types';

// 수정요청사항(2026-08-03, p.4): 기획서에 명시한 "플레어의 업/다운보트 UI 변형 텍스트와
// 1-Click 액션 적용 여부를 일대일로 매핑함"의 의미대로, 글쓴이 1-Click 액션 버튼/상태뱃지는
// 별도의 action_label_a/b 텍스트 대신 그 플레어의 vote_up_label/vote_down_label을 그대로
// 재사용한다(예: "지출 방어 완료(안 사기로 함)/구매 완료" → "사라/참아라"). 텍스트가 짧아지면서
// 버튼 2줄 줄바꿈 문제도 함께 해결된다.
//
// 단, action_label_a만 채워지고 action_label_b가 null인 단일옵션 플레어(예: [룸 제안]의
// "제안 전달/반영 완료")는 투표 찬반 방향과 무관한 별개의 완료 상태라 예외로 두고 기존
// action_label_a 텍스트를 그대로 쓴다. (a/b가 둘 다 null인 경우 — 예: 새로 has_one_click_action이
// 켜졌지만 별도 텍스트를 채운 적 없는 [결정해줘] — 는 단일옵션이 아니라 binary이므로 아래로 진행)
export function getAuthorActionLabels(flair: PostFlair): { labelA: string | null; labelB: string | null } {
  if (flair.action_label_a !== null && flair.action_label_b === null) {
    return { labelA: flair.action_label_a, labelB: null };
  }
  return { labelA: flair.vote_up_label, labelB: flair.vote_down_label };
}

export function getAuthorActionStatusLabel(flair: PostFlair, value: 'a' | 'b' | null): string | null {
  if (!value) return null;
  const { labelA, labelB } = getAuthorActionLabels(flair);
  return value === 'a' ? labelA : labelB;
}
