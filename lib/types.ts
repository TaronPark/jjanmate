// schema.sql과 1:1로 대응하는 타입 정의. DB 컬럼이 바뀌면 여기도 같이 고칠 것.
import type { NicheCode } from './niches';

export type PostStatus = 'pending' | 'success' | 'low_confidence' | 'system_error';
export type ReactionType = 'cheer' | 'me_too';

export interface Profile {
  id: string;
  nickname: string;
  onboarding_niche: NicheCode;
  current_streak: number;
  longest_streak: number;
  last_post_date: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  ai_niche: NicheCode | null;
  niche_hint_mismatch: boolean | null;
  subtags: string[] | null;
  is_spam: boolean;
  spam_reason: string | null;
  confidence: number | null;
  status: PostStatus;
  retry_count: number;
  created_at: string;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface MatchingPreview {
  id: string;
  niche: NicheCode;
  preview_snapshot: { nickname_mask: string; content: string }[];
  generated_at: string;
}
