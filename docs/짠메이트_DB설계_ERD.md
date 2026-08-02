# 짠메이트 DB 스키마 설계 (ERD) — v1, 대체됨

> ⚠️ **본 문서는 2026-08-02부로 [`짠메이트_DB_스키마_설계_v2.md`](./짠메이트_DB_스키마_설계_v2.md)로 대체되었습니다.**
> 니치/AI태깅 기반 테이블(posts v1, reactions, matching_previews, seed_contents_pool)이 전부 삭제되고
> 레딧형 업보트 커뮤니티 스키마(rooms/post_flairs/posts/comments/votes/bookmarks/drafts/monthly_badges/notifications/blacklist_words)로 대체됐습니다.
> 최신 `schema.sql`도 v2 스키마 기준으로 전면 재작성되었습니다. 이하 내용은 과거 설계 기록으로만 보존합니다.
>
> ---

> 기획서 5·6·9·10번 섹션 기준. 실제 SQL은 `schema.sql`에 있음.
> 2026-07-21 갱신: 원클릭 공감 리액션 Must 승격에 따라 `reactions` 테이블 추가.
> 2026-07-24 갱신: 런칭 니치 전면 개편(생애주기 → 소비 페인포인트)에 따라 니치 코드/표시명 전면 교체.
> 2026-07-25 갱신: `profiles.nickname`을 카카오에서 가져오지 않고 유저가 직접 입력하는 값으로 결정(컬럼 구조 변경 없음, 의미만 확정).

---

## 1. 테이블은 왜 이렇게 나눴나 (쉬운 설명)

레고 블록이라고 생각하면 돼. 짠메이트에서 저장해야 하는 "덩어리"는 크게 4개야.

1. **사람** (누가 가입했고, 어떤 니치를 골랐고, 연속 며칠 글 썼는지)
2. **글** (누가, 무슨 내용을, AI가 뭐라고 태그 붙였는지)
3. **매칭 미리보기** (가입 전에 "이런 사람들 있어요"라고 보여줄 캐시 데이터)
4. **공감 반응** (다른 사람 글에 "대단해요"/"나도 절약중" 눌러준 기록)

이 4덩어리를 각각 테이블 하나씩으로 만들면 됨: `profiles`, `posts`, `matching_previews`, `reactions`.

---

## 2. 테이블 상세

### 2-1. `profiles` (사람 정보)

Supabase는 로그인 정보(`auth.users`)를 이미 자기가 따로 관리해. 여기에 손대면 안 돼서(인증 시스템이라 건드리면 위험), 짠메이트만의 정보(닉네임, 니치, 스트릭)는 별도 테이블에 두고 `id`로 연결만 해. 이게 Supabase 표준 방식이야.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | auth.users.id 와 동일값 (1:1 연결) |
| nickname | text | 표시 이름. **카카오 닉네임이 아니라 로그인 직후 유저가 직접 입력한 값** (2026-07-25 결정, 아래 판단 이유 참고) |
| onboarding_niche | text | 가입 시 **직접 선택한** 니치 (월세독립군/홧김비용방어/눈팅러) |
| current_streak | int | 현재 연속 게시일 수 |
| longest_streak | int | 최고 기록 |
| last_post_date | date | 스트릭 계산용 (오늘 이미 썼는지 체크) |
| created_at | timestamptz | 가입일 |

**판단 이유 — `onboarding_niche`가 왜 `profiles`에 있나:**
기획서 10번 KPI에 "니치 재분류 비율(`niche_hint_mismatch`)"이 있어. 이건 "유저가 처음 고른 니치"와 "AI가 실제 글 보고 판정한 니치"가 다른 비율이야. 그러니까 "유저가 처음 고른 값"은 유저 단위로 딱 하나만 있으면 되고(가입할 때 한 번 고르는 값), "AI가 판정한 값"은 글 하나하나마다 다를 수 있어(글 주제에 따라). 그래서 전자는 `profiles`에, 후자는 `posts`에 각각 넣었어.

**참고 — 로그인 프로바이더:** 2026-07-21 기획서 확정에 따라 MVP는 카카오 단일 로그인만 지원. `auth.users`는 Supabase가 관리하는 영역이라 이 테이블 구조에는 영향 없음(프로바이더는 Supabase Auth 설정값 문제).

**판단 이유 — `nickname`을 카카오에서 안 가져오고 직접 입력받는 이유 (2026-07-25):** 원래는 카카오 로그인 시 `profile_nickname`/`profile_image` 동의항목을 필수로 받아 그대로 쓰려 했으나, 짠메이트가 다루는 콘텐츠가 "소비 실패 인증"처럼 다소 민감한 내용이라 실명에 가까운 카카오 닉네임·프로필 사진이 그대로 노출되면 유저 거부감이 클 것으로 판단함. 이미 매칭 프리뷰(4-A 3번)에서도 실명 대신 `[니치 동료]`로 마스킹하는 전략을 쓰고 있어, 톤을 맞추기 위해 로그인 직후 별도의 "닉네임 직접 입력" 화면을 추가함. 카카오 동의항목도 닉네임·프로필사진 모두 "사용 안 함"으로 변경.

### 2-2. `posts` (게시글 + AI 태깅 결과)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | 글 고유 ID |
| user_id | uuid (FK → profiles.id) | 작성자 |
| content | text, 최대 300자 | 게시 내용 (공백 포함 300자, DB에서 강제) |
| image_url | text, nullable | 영수증 사진 (Supabase Storage에 저장하고 URL만 여기 저장) |
| ai_niche | text, nullable | AI가 최종 판정한 니치 |
| niche_hint_mismatch | boolean | `profiles.onboarding_niche` ≠ `ai_niche` 이면 true |
| subtags | text[], 최대 3개 | 예: {자취식비, 편의점절약} |
| is_spam | boolean, default false | 스팸 여부 (격리, 삭제 아님) |
| spam_reason | text, nullable | 운영진 스팟체크용 근거 |
| confidence | numeric, nullable | AI 판정 확신도 |
| status | text | pending / success / low_confidence / system_error |
| retry_count | int, default 0 | system_error 재시도 횟수 (최대 3) |
| created_at | timestamptz | 게시 시각 |

**판단 이유 — 왜 `is_spam=true`인 글도 지우지 않고 여기 남기나:**
기획서 5번에 "스팸/광고 게시글 자동 판정 및 격리 (spam_reason 포함, 완전 삭제 아님)"라고 명시돼 있어. 지워버리면 운영진이 "AI가 왜 이걸 스팸이라고 했지?"를 나중에 확인할 방법이 없어져. 그래서 `is_spam` 플래그만 세우고, 피드 조회 쿼리에서 `is_spam = false`인 것만 보여주는 방식으로 처리해.

**판단 이유 — 왜 `status`에 `pending`을 추가했나 (기획서엔 success/low_confidence/system_error 3개만 있음):**
글을 올린 순간과 AI가 태그를 다 붙인 순간 사이에 시간차가 있어(기획서 4-A 4번: "게시 직후 AI가 실시간으로 태그를 붙이는 과정을 화면에 노출"). 이 사이 상태를 표현할 값이 없으면 DB에서 "아직 처리 안 됨"과 "처리했는데 애매함(low_confidence)"을 구분 못 해. 그래서 `pending`을 초기값으로 추가했어.

**판단 이유 — 별도 "재시도 큐 테이블"을 안 만들고 `posts.retry_count`로 처리한 이유:**
로드맵 4주차에 "백그라운드 재시도 큐 구축"이 있는데, 큐 전용 테이블을 새로 만들면 posts와 별도로 동기화해야 해서 관리 포인트가 늘어나. 베타 규모에서는 크론잡이 `WHERE status='system_error' AND retry_count<3`으로 posts 테이블을 직접 조회하는 걸로 충분해.

### 2-3. `matching_previews` (가입 전 매칭 미리보기 캐시)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | ID |
| niche | text | 어느 니치용 미리보기인지 |
| preview_snapshot | jsonb | 시드 콘텐츠 기반 미리보기 목록 (배치로 하루 1회 갱신) |
| generated_at | timestamptz | 마지막 갱신 시각 |

**판단 이유:** 기획서 5번에 "매칭 프리뷰 — 정적/캐싱 구현, 5주차 운영진 시드 콘텐츠 기반, 일 1회 배치 갱신"이라고 명시돼 있어. 실시간으로 매칭 계산 안 하고 하루 한 번 만들어둔 걸 그냥 보여주는 거라, 이 테이블은 사실상 "캐시 저장소"야. 니치가 3개뿐이라 `niche`당 최신 row 하나만 유지하면 됨(갱신 시 upsert).

**2026-07-21 갱신:** 프리뷰 노출 방식이 "블러 처리"에서 "닉네임만 마스킹, 본문 실제 노출"로 바뀜. `preview_snapshot` jsonb 안에는 원래 시드 콘텐츠 본문을 그대로 저장하고, 화면단에서 작성자 표시 부분만 `[{니치 표시명} 동료]` 형태로 렌더링. DB 구조 변경은 없음(표시 로직만 프론트에서 처리).

### 2-4. `reactions` (게시글 공감 반응) — 2026-07-21 신규 추가

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | ID |
| post_id | uuid (FK → posts.id) | 반응 대상 게시글 |
| user_id | uuid (FK → profiles.id) | 반응을 남긴 유저 |
| reaction_type | text | 'cheer'(대단해요) / 'me_too'(나도 절약중) |
| created_at | timestamptz | 반응 시각 |

**판단 이유 — 왜 별도 테이블로 만들었나 (posts에 카운트 컬럼만 두지 않은 이유):**
단순히 `posts.cheer_count` 같은 숫자 컬럼만 두면 "누가 눌렀는지"를 알 수 없어서 같은 유저가 같은 글에 여러 번 누르는 걸 막을 방법이 없어. `reactions`를 별도 테이블로 두고 `(post_id, user_id, reaction_type)`에 유니크 제약을 걸면, 중복 클릭은 DB 레벨에서 자동으로 막히고 나중에 "이 유저가 뭘 눌렀는지" 취소(토글) 기능도 자연스럽게 구현할 수 있어.

**판단 이유 — 이 테이블이 왜 Must로 승격됐나:**
원래 기획서엔 없던 기능인데, "거지방류 비난 문화와 다른 무해한 연대"라는 짠메이트의 핵심 톤앤매너(2번 MVP 컨셉, 4-C 사회적 정체성 이론)를 실제로 체감시키는 장치가 스트릭·랭킹뿐이었어. 댓글은 진입장벽이 높지만 원클릭 반응은 장벽이 거의 없어서 리텐션 기여 대비 구현 비용(테이블 1개, 버튼 2개)이 낮다고 판단해 2026-07-21 Must로 승격함.

### 2-5. 니치 값 = 내부 코드 vs 표시명 분리

니치 명칭이 아직 최종 확정 전이라는 걸 확인해서, DB 제약조건 값을 한글 이름에서 내부 고정 코드로 교체함:

| 내부 코드 (DB 저장값) | 현재 표시명 |
|---|---|
| monthly_rent_fighter | 월세 독립군 |
| impulse_expense_defender | SNS 지름신 & 홧김비용 방어 |
| lurker_lounge | 프로눈팅러의 대리만족 |

한글 표시명은 DB가 아니라 `niches.ts` 한 파일에서만 관리. 이름만 바뀌는 경우엔 이 파일의 label 값만 고치면 되고 DB 마이그레이션이 필요 없음. "니치 룸" 명칭(예: "숨만 쉬어도 나가는 돈, 월세 독립군 룸")도 이 파일의 roomName 필드에서 관리하며 DB 구조와 무관.

**2026-07-24 니치 전면 개편 이력:** 기존 생애주기 기준 니치(자취생 `self_catering` / 사회초년생 `low_income_worker` / 무지출챌린지 `no_spend_challenge`)를 소비 페인포인트 기준(월세독립군 `monthly_rent_fighter` / 홧김비용방어 `impulse_expense_defender` / 눈팅러 `lurker_lounge`)으로 전면 교체함. 이번엔 표시명만 바뀐 게 아니라 니치가 가리키는 대상 자체가 바뀌었기 때문에(생애주기 → 소비심리), 내부 코드도 함께 교체함 — 실 데이터가 0건인 시점이라 마이그레이션 비용은 없음. 다만 실제 Supabase 프로젝트에는 옛 코드값 기준 CHECK 제약조건이 이미 적용돼 있어, 1~2주차 DB 반영 시 `ALTER TABLE ... DROP CONSTRAINT` 후 새 값으로 재생성하는 마이그레이션이 필요함 (`schema.sql` 갱신 이력 참고).

**참고 — 니치 간 개념적 중첩은 스키마 변경 없이 흡수됨:** 새 니치들은 생애주기처럼 상호 배타적이지 않고(예: 월세독립군 유저도 홧김비용을 겪을 수 있음), `profiles.onboarding_niche`(가입 시 고른 홈룸)와 `posts.ai_niche`(그 글이 실제로 어울리는 니치)가 원래부터 독립적으로 설계돼 있어 문제 없음. 홈룸은 월세독립군이어도 홧김비용 얘기를 쓴 글은 자동으로 그 피드에 노출됨. `niche_hint_mismatch` 플래그의 의미도 "생애주기 졸업 이동 관찰"에서 "유저가 여러 소비고통에 걸쳐있다는 재발견 지표"로 해석이 바뀜(기획서 10번 KPI 참고) — 이 데이터는 향후 "잔바리 지출 철벽" 니치 분리독립 여부를 판단하는 근거로도 재활용 가능(로드맵 백로그 참고).

---

## 3. 관계 요약

```
auth.users (Supabase 관리, 카카오 단일 OAuth) 1 ── 1 profiles
profiles 1 ── N posts
profiles 1 ── N reactions
posts 1 ── N reactions
matching_previews  (독립 테이블, niche 값으로만 조회)
```

## 4. 인덱스 (조회 성능)

- `posts (niche, is_spam, created_at desc)` — 태그별 피드 화면에서 가장 많이 쓰는 조회 패턴이라 여기에 인덱스 안 걸면 유저 늘어날 때 피드가 느려짐
- `posts (user_id, created_at)` — 스트릭 계산(유저별 최근 게시일 확인)용
- `profiles (onboarding_niche)` — 니치별 활성 유저 수 KPI 집계용
- `reactions (post_id)` — 게시글 카드에 반응 개수를 집계해서 보여줄 때 조회용

## 5-1. 실제 검증 결과 (2026-07-20, 2026-07-25 갱신)

샌드박스가 아니라 실제 Supabase 프로젝트(`TaronPark's MVP`)에 이 스키마를 그대로 실행해서 검증 완료. 결과: 3개 테이블(profiles, posts, matching_previews), 외래키, 체크 제약조건 모두 설계대로 정상 생성됨.

**2026-07-25 갱신 — 1~2주차 DB 작업 완료:** `reactions` 테이블을 실제 프로젝트에 생성 완료(2026-07-21 설계분). 니치 전면 개편(2026-07-24)에 따라 `profiles.onboarding_niche`/`posts.ai_niche`/`matching_previews.niche` 3개 컬럼의 CHECK 제약조건을 옛 코드(self_catering 등)에서 신규 코드(monthly_rent_fighter 등)로 마이그레이션 완료. 마이그레이션 전 `pg_constraint` 직접 조회로 실제 제약조건 이름을 확인 후 정확히 DROP/재생성함.

검증 과정에서 Supabase 보안 점검 도구가 "RLS(줄 단위 잠금장치)가 꺼져있다"는 경고를 띄웠던 건, 4개 테이블 모두 RLS ON + 아래 정책 적용으로 해소됨(2026-07-25). **이 항목 완료.**

**적용된 RLS 정책 요약** (전체 SQL은 `schema.sql` 참고):
- `profiles`: 생성(본인 id만)/조회(전체 공개)/수정(본인만 — 통계 필드 클라이언트 조작 방지는 4주차 스트릭 로직에서 백엔드 단 별도 통제 예정)
- `posts`: 생성(본인 user_id만)/조회(성공+비스팸 글은 전체 공개, 작성자 본인은 상태 무관 항상 조회)/삭제(작성자 본인만)/**수정 정책 없음**(MVP에 게시글 수정 기능 자체가 없고, status·ai_niche·is_spam 등 AI 파이프라인 전용 필드를 유저가 직접 조작해 스팸 필터를 우회하는 걸 막기 위한 의도적 설계)
- `matching_previews`: 조회만 전체 공개, 생성/수정/삭제 정책 없음(배치 갱신은 service_role 키로 RLS 우회)
- `reactions`: 생성/삭제(본인 반응만)/조회(전체 공개)

## 5-2. MVP 범위에서 일부러 뺀 것

- `weekly_rankings`, 배지 테이블 → Should(2차) 기능이라 지금 안 만듦. 나중에 추가해도 기존 테이블 구조를 안 건드리고 새 테이블만 추가하면 됨.
- `ranking_visible` 같은 토글 컬럼도 지금은 안 넣었어. "지금 안 쓰는 컬럼을 미리 넣어두자"는 유혹이 있는데, 실제 기능 붙일 때 필요한 컬럼이 정확히 뭔지 다시 판단하는 게 나아 — 지금 넣으면 안 쓰는 컬럼이 계속 스키마에 남아서 헷갈려.
- `reactions.reaction_type`에 댓글(comment) 기능은 포함하지 않음 — 기획서에 텍스트 키워드 검색과 함께 Should 단계 후보로만 남아있고 Must 범위 밖.
