// docs/짠메이트_DB_스키마_설계_v2.md와 1:1로 대응하는 타입 정의. DB 컬럼이 바뀌면 여기도 같이 고칠 것.
// 2026-08-02 피벗: 니치/AI태깅/스트릭 기반 v1 타입을 전면 대체(레딧형 업보트 커뮤니티).

export interface Room {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  display_order: number;
  created_at: string;
}

export interface PostFlair {
  id: string;
  room_id: string;
  code: string;
  label: string;
  vote_up_label: string;
  vote_down_label: string;
  show_ratio_bar: boolean;
  has_one_click_action: boolean;
  action_label_a: string | null;
  action_label_b: string | null;
  display_order: number;
}

export interface Profile {
  id: string;
  nickname: string;
  user_flair: string | null;
  notify_vote_feedback: boolean;
  notify_comment_reply: boolean;
  notify_monthly_badge: boolean;
  default_room_id: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  room_id: string;
  flair_id: string;
  title: string;
  body: string;
  one_line_question: string | null;
  image_urls: string[] | null;
  upvote_count: number;
  downvote_count: number;
  author_action_value: 'a' | 'b' | null;
  author_action_completed_at: string | null;
  comment_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  user_id: string;
  mentioned_nickname: string | null;
  body: string;
  upvote_count: number;
  downvote_count: number;
  is_deleted: boolean;
  created_at: string;
}

export type VoteTargetType = 'post' | 'comment';

export interface Vote {
  id: string;
  target_type: VoteTargetType;
  target_id: string;
  user_id: string;
  value: 1 | -1;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Draft {
  id: string;
  user_id: string;
  room_id: string | null;
  flair_id: string | null;
  title: string | null;
  body: string | null;
  one_line_question: string | null;
  image_urls: string[] | null;
  updated_at: string;
  expires_at: string;
}

export interface MonthlyBadge {
  id: string;
  year_month: string;
  scope: 'room' | 'global';
  room_id: string | null;
  category: 'post' | 'comment';
  rank: 1 | 2 | 3;
  user_id: string;
  score: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'vote_feedback' | 'comment_reply' | 'monthly_badge';
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// 피드 카드 렌더링에 필요한 조인된 뷰 모델. DB 테이블과 1:1이 아니라 화면 조합용.
export interface FeedPost extends Post {
  room: Room;
  flair: PostFlair;
  author_nickname: string;
  author_user_flair: string | null;
  // 작성자가 "현재 유지 중인" 월간 배지를 보유했는지(가장 최근 정산 year_month 기준).
  // 시안의 크라운 아이콘은 항상 노출되지만(정적 목업), 실제로는 이 조건이 참일 때만 표시한다.
  author_has_badge: boolean;
  is_bookmarked: boolean;
  best_comment: { body: string; net_upvotes: number } | null;
  my_vote: 1 | -1 | 0;
}
