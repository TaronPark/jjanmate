-- ============================================================
-- 짠메이트 MVP DB 스키마 v2 (레딧형 업보트 커뮤니티)
-- 대상: Supabase (PostgreSQL), project ref: tmawuxjllizzixancfyg
-- 설계 근거: docs/짠메이트_DB_스키마_설계_v2.md
-- 작성일: 2026-08-02 (피벗 — 니치/AI태깅 기반 v1 스키마 전면 대체)
--
-- 이 파일은 실제 Supabase 프로젝트에 적용된 마이그레이션들을 시간순으로 재구성한
-- 참고용 사본이다. 실제 DB 상태가 진실원이며, 마이그레이션 이력은 Supabase 대시보드
-- Database > Migrations에서 확인 가능(마이그레이션명 접두어: create_rooms_and_flairs,
-- create_blacklist_words, alter_profiles_for_pivot, drop_legacy_niche_tables,
-- create_posts_and_comments, enable_rls_and_policies, vote_and_comment_count_triggers,
-- hot_score_functions, security_hardening_functions, feed_rpc_functions).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. rooms — 6대 메인 룸(고정)
-- ------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  subtitle text not null,
  display_order int unique not null,
  created_at timestamptz not null default now()
);

-- 시드: 자취룸/C발비용/식비절약/티끌모으기/직장생활/짠수다 (display_order 1~6)

-- ------------------------------------------------------------
-- 2. post_flairs — 룸당 4개, 총 24개 고정 플레어
-- ------------------------------------------------------------
create table public.post_flairs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  code text not null,
  label text not null,
  vote_up_label text not null default '추천',
  vote_down_label text not null default '비추',
  show_ratio_bar boolean not null default false,       -- 투표형 4종만 true
  has_one_click_action boolean not null default false,  -- 투표형 4종만 true
  action_label_a text,
  action_label_b text,  -- 룸 제안처럼 단일 옵션이면 null
  display_order int not null,
  unique(room_id, code),
  unique(room_id, display_order)
);

-- ------------------------------------------------------------
-- 3. blacklist_words — 유저 플레어 금지어 (client 접근 불가, service_role 전용)
-- ------------------------------------------------------------
create table public.blacklist_words (
  id uuid primary key default gen_random_uuid(),
  word text unique not null,
  category text not null check (category in ('impersonation','explicit','hate_politics','profanity','spam_commercial','system_bypass')),
  created_at timestamptz not null default now()
);
-- RLS enabled, 정책 없음(의도적) — client는 절대 조회 불가, lib/blacklist.ts가 admin 클라이언트로만 접근

-- ------------------------------------------------------------
-- 4. profiles (v1에서 니치/스트릭 컬럼 제거, 유저플레어/알림설정/기본룸 추가)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  user_flair text check (char_length(user_flair) <= 5),
  notify_vote_feedback boolean not null default true,
  notify_comment_reply boolean not null default true,
  notify_monthly_badge boolean not null default true,
  default_room_id uuid references public.rooms(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. posts
-- ------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  room_id uuid not null references public.rooms(id),
  flair_id uuid not null references public.post_flairs(id),
  title text not null check (char_length(title) >= 2),
  body text not null,
  one_line_question text,
  image_urls text[],
  upvote_count int not null default 0,
  downvote_count int not null default 0,
  author_action_value text check (author_action_value in ('a','b')),
  author_action_completed_at timestamptz,
  comment_count int not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_room_created_idx on public.posts (room_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
create index posts_user_idx on public.posts (user_id);

-- ------------------------------------------------------------
-- 6. comments — 1-Depth 스레드 (parent_comment_id는 항상 최상위 댓글만 가리킴, 앱에서 강제)
-- ------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  mentioned_nickname text,
  body text not null,
  upvote_count int not null default 0,
  downvote_count int not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post_parent_idx on public.comments (post_id, parent_comment_id, created_at);

-- ------------------------------------------------------------
-- 7. votes — post/comment 통합, 트리거로 upvote_count/downvote_count 자동 갱신
-- ------------------------------------------------------------
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post','comment')),
  target_id uuid not null,
  user_id uuid not null references public.profiles(id),
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);
create index votes_target_idx on public.votes (target_type, target_id);

-- ------------------------------------------------------------
-- 8. bookmarks
-- ------------------------------------------------------------
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);
create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

-- ------------------------------------------------------------
-- 9. drafts — 유저당 1개, 당일 24:00(KST) 만료
-- ------------------------------------------------------------
create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id),
  room_id uuid references public.rooms(id),
  flair_id uuid references public.post_flairs(id),
  title text,
  body text,
  one_line_question text,
  image_urls text[],
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- ------------------------------------------------------------
-- 10. monthly_badges — 월간 배지 스냅샷 (배치 job: app/api/cron/monthly-badges/route.ts, 매일 KST 00:00 실행 후 1일에만 정산)
-- ------------------------------------------------------------
create table public.monthly_badges (
  id uuid primary key default gen_random_uuid(),
  year_month text not null,
  scope text not null check (scope in ('room','global')),
  room_id uuid references public.rooms(id),
  category text not null check (category in ('post','comment')),
  rank smallint not null check (rank in (1,2,3)),
  user_id uuid not null references public.profiles(id),
  score int not null,
  created_at timestamptz not null default now(),
  unique (year_month, scope, room_id, category, rank)
);

-- ------------------------------------------------------------
-- 11. notifications — 발송 로직: lib/notify.ts(생성) + app/notifications(조회/읽음처리 UI).
--     생성 트리거: setAuthorAction(vote_feedback), createComment(comment_reply),
--     monthly-badges 크론(monthly_badge). 항상 service_role로만 insert(자가생성 방지, lib/notify.ts 주석 참고)
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null check (type in ('vote_feedback','comment_reply','monthly_badge')),
  payload jsonb not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ------------------------------------------------------------
-- 12. RLS 요약
-- ------------------------------------------------------------
-- rooms, post_flairs, monthly_badges: 전체 공개 읽기(select using true), 쓰기 없음/service_role만
-- blacklist_words: RLS enabled, 정책 없음 — client 접근 완전 차단
-- posts, comments: select 전체 공개, insert는 본인(auth.uid()=user_id)만.
--   수정/삭제(is_deleted, author_action_value 등)는 클라이언트 UPDATE 정책을 열지 않고,
--   서버 액션이 소유권을 수동 검증한 뒤 service_role(admin) 클라이언트로 처리한다
--   (app/post/[id]/actions.ts, app/mypage/actions.ts 참고) — count 컬럼 클라이언트 변조 방지 목적.
-- votes, bookmarks, drafts, notifications: select/insert/update/delete 모두 본인(auth.uid()=user_id)만.

-- ------------------------------------------------------------
-- 13. 트리거
-- ------------------------------------------------------------
-- sync_vote_counts(): votes insert/update/delete 시 posts/comments의 upvote_count/downvote_count 자동 갱신
-- sync_comment_count(): comments insert / is_deleted 토글 시 posts.comment_count 자동 갱신
-- 둘 다 SECURITY DEFINER + search_path=public 고정, anon/authenticated의 직접 RPC 호출은 REVOKE 처리
-- (트리거 자체 실행에는 영향 없음 — 하이재킹 방지 목적의 보안 하드닝).

-- ------------------------------------------------------------
-- 14. Hot Score 함수 (docs/짠메이트_DB_스키마_설계_v2.md §3 참고)
-- ------------------------------------------------------------
-- raw_hot_score(upvotes, downvotes, created_at): 룸 피드용. 콜드스타트 실드(최초 2시간 다운보트
--   50% 가중)는 이 함수 내부 정렬 계산에만 적용되고, posts.upvote_count/downvote_count(화면 표시값)는
--   항상 원본 그대로 유지된다.
-- room_weight(room_id): W_room, 최근 48h 전체 룸 평균 글수/해당 룸 글수, 0.5~2.0 캡.
-- best_comment_score(post_id): S_comment, 게시글 내 1등 댓글 순업보트(0 이하면 0).
-- popular_hot_score(post_id): (raw_hot_score + S_comment*0.3) * W_room. 인기 피드용.
-- get_room_feed(room_id, flair_id, sort, limit, offset): 룸 피드 조회 RPC.
-- get_popular_feed(limit, offset): 인기 피드 조회 RPC. 둘 다 48h 노출 제한(인기순일 때만) 적용.
