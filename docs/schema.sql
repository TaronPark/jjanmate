-- ============================================================
-- 짠메이트 MVP DB 스키마
-- 대상: Supabase (PostgreSQL)
-- 설계 근거: 짠메이트_DB설계_ERD.md 참고
-- 작성일: 2026-07-20 / 갱신일: 2026-07-25
--   2026-07-21: reactions 테이블 추가 (당시 아직 실제 Supabase 프로젝트 미적용)
--   2026-07-24: 니치 전면 개편(생애주기→소비 페인포인트)에 따라 CHECK 제약값 교체
--     (self_catering/low_income_worker/no_spend_challenge →
--      monthly_rent_fighter/impulse_expense_defender/lurker_lounge)
--   2026-07-25: nickname 컬럼 코멘트 추가 — 카카오 닉네임이 아니라 로그인 직후 유저가
--     직접 입력한 값을 저장하기로 결정 (컬럼 타입/제약조건 자체는 변경 없음)
--   2026-07-25: 실제 Supabase 프로젝트에 마이그레이션 적용 완료 —
--     profiles/posts/matching_previews 3개 테이블 CHECK 제약조건을 신규 니치 코드로 교체,
--     reactions 테이블 신규 생성, 4개 테이블 RLS 정책 적용까지 모두 반영됨
--     (마이그레이션명: niche_migration_reactions_table_rls_policies).
--     이제 이 schema.sql은 실제 DB 상태와 일치함.
-- ============================================================

-- uuid 자동생성 함수 확장 (Supabase는 기본 활성화된 경우가 많지만 명시)
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. profiles
--    auth.users(Supabase가 관리하는 로그인 테이블)에 1:1로 붙는
--    짠메이트 전용 사용자 정보 테이블
--    로그인 프로바이더는 카카오 단일(MVP 범위) — Supabase Auth 설정값이라 이 테이블 구조와 무관
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  -- 내부 고정 코드. 한글 표시명은 DB가 아니라 앱 코드(niches.ts)에서 매핑함 — 이름 변경 시 DB 무변경.
  onboarding_niche text not null
    check (onboarding_niche in ('monthly_rent_fighter', 'impulse_expense_defender', 'lurker_lounge')),
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_post_date date,
  created_at timestamptz not null default now()
);

comment on table public.profiles is '짠메이트 사용자 프로필. auth.users(id)와 1:1 연결.';
comment on column public.profiles.nickname is '로그인 직후 유저가 직접 입력한 짠메이트 전용 닉네임. 카카오 닉네임/프로필사진은 가져오지 않음(2026-07-25 결정, ERD 2-1 판단 이유 참고).';
comment on column public.profiles.onboarding_niche is '가입 시 유저가 직접 선택한 니치 (AI 판정값과 별개, niche_hint_mismatch 계산의 기준값)';

create index idx_profiles_onboarding_niche on public.profiles (onboarding_niche);

-- ------------------------------------------------------------
-- 2. posts
--    게시글 + AI 태깅 파이프라인 결과 (기획서 6번 섹션 스키마 반영)
-- ------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 300),
  image_url text,

  -- AI 태깅 결과 (기획서 6번: niche, niche_hint_mismatch, subtags[], is_spam, spam_reason, confidence, status)
  ai_niche text
    check (ai_niche is null or ai_niche in ('monthly_rent_fighter', 'impulse_expense_defender', 'lurker_lounge')),
  niche_hint_mismatch boolean,
  subtags text[] check (subtags is null or array_length(subtags, 1) <= 3),
  is_spam boolean not null default false,
  spam_reason text,
  confidence numeric(4,3), -- 0.000 ~ 1.000

  -- 처리 상태: pending(대기) -> success / low_confidence / system_error
  -- pending은 기획서 원 스키마엔 없으나, "게시 직후 실시간 태깅 전" 구간을 표현하기 위해 추가함 (ERD 문서 판단 이유 참고)
  status text not null default 'pending'
    check (status in ('pending', 'success', 'low_confidence', 'system_error')),
  retry_count int not null default 0 check (retry_count <= 3),

  created_at timestamptz not null default now()
);

comment on table public.posts is '지출/무지출 게시글 + AI 태깅 결과. 스팸 판정 글도 삭제하지 않고 is_spam 플래그로만 격리.';
comment on column public.posts.status is 'pending: 태깅 대기 / success: 정상 분류 / low_confidence: 확신도 낮아 미분류(재시도 안함) / system_error: 시스템 오류(최대 3회 재시도)';

-- 태그별 피드 조회용 (가장 자주 실행되는 쿼리 패턴)
create index idx_posts_niche_feed
  on public.posts (ai_niche, is_spam, created_at desc)
  where status = 'success';

-- 스트릭 계산용 (유저별 최근 게시 이력 조회)
create index idx_posts_user_created
  on public.posts (user_id, created_at desc);

-- 재시도 큐 조회용 (system_error 인 것만 빠르게 스캔)
create index idx_posts_retry_queue
  on public.posts (status, retry_count)
  where status = 'system_error';

-- ------------------------------------------------------------
-- 3. matching_previews
--    가입 전 "이런 사람들과 매칭됩니다" 정적 프리뷰 캐시
--    (기획서 5번: 5주차 시드 콘텐츠 기반, 일 1회 배치 갱신)
--    2026-07-21: 블러 처리 폐기 — preview_snapshot에는 시드 콘텐츠 본문을 그대로 저장하고,
--    작성자 표시는 프론트에서 "[{니치} 동료]"로만 마스킹 (DB 구조 변경 없음)
-- ------------------------------------------------------------
create table public.matching_previews (
  id uuid primary key default gen_random_uuid(),
  niche text not null unique
    check (niche in ('monthly_rent_fighter', 'impulse_expense_defender', 'lurker_lounge')),
  preview_snapshot jsonb not null,
  generated_at timestamptz not null default now()
);

comment on table public.matching_previews is '니치별 매칭 미리보기 캐시. 하루 1회 배치(cron)가 upsert로 갱신. 본문은 실제 시드 콘텐츠 그대로, 작성자만 프론트에서 마스킹.';

-- ------------------------------------------------------------
-- 4. reactions  (2026-07-21 신규 추가 — 원클릭 공감 반응, Must 승격)
--    "무해한 연대" 톤앤매너를 구현하는 저비용 리텐션 장치.
--    댓글보다 참여 장벽이 낮음. 유니크 제약으로 중복 클릭 방지.
-- ------------------------------------------------------------
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('cheer', 'me_too')),
  created_at timestamptz not null default now(),

  unique (post_id, user_id, reaction_type)
);

comment on table public.reactions is '게시글에 대한 원클릭 공감 반응 (cheer=대단해요, me_too=나도 절약중). 유저당 글당 반응타입별 1회만 허용.';

-- 게시글 카드에 반응 개수 집계해서 보여줄 때 조회용
create index idx_reactions_post on public.reactions (post_id);

-- ============================================================
-- Row Level Security(RLS) — 2026-07-25 실제 Supabase 프로젝트에 적용 완료
-- (마이그레이션명: niche_migration_reactions_table_rls_policies)
-- 4개 테이블 모두 RLS ON + 아래 정책 적용. 명시되지 않은 동작(예: posts UPDATE)은
-- 정책을 만들지 않아 RLS 기본 거부(Deny)가 그대로 유지됨.
--
-- [profiles] insert: 본인 id로만 생성(authenticated) / select: 전체 공개(public)
--            / update: 본인만(authenticated) — 주의: current_streak 등 통계 필드의
--            클라이언트 직접 조작 방지는 컬럼 단위로 막지 않았음. 4주차 스트릭 로직 구현 시
--            백엔드(Edge Function 등) 단에서 별도 통제 필요.
-- [posts]    insert: 본인 user_id로만 생성(authenticated)
--            / select: status='success' AND is_spam=false 는 누구나(public), 작성자 본인은
--            상태 무관 항상 조회 가능 / delete: 작성자 본인만(authenticated)
--            / update: 정책 없음(의도적) — MVP에 게시글 수정 기능이 없고, status/ai_niche/
--            is_spam 등 AI 파이프라인 전용 필드를 유저가 직접 조작(스팸 필터 우회)하는 것을
--            막기 위해 UPDATE는 전부 차단
-- [matching_previews] select: 전체 공개(public) / insert·update·delete: 정책 없음
--            (배치 갱신 스크립트는 service_role 키로 RLS 우회)
-- [reactions] insert·delete: 본인 반응만(authenticated) / select: 전체 공개(public)
-- ============================================================
