# 짠메이트 DB 스키마 설계 v2 (초안 — 리뷰 대기)

> 작성일: 2026-08-02
> 근거 문서: `짠메이트_기획서 재구성 노트_260801_v4.pdf` (전체 재확인 완료), `짠메이트_MVP_기획서_v2.md`, `짠메이트_MVP_개발로드맵_v2.md`
> 상태: **초안. 아직 마이그레이션 적용 전.** 하단 "확인 필요 항목" 답변 받은 뒤 `apply_migration` 실행 예정.

---

## 0. 설계 원칙

- Hot Score(Raw/Popular)는 **쿼리 타임 계산**으로 설계(SQL 함수/뷰). Vercel Hobby 크론 제약을 피하고, MVP 트래픽 규모에서는 배치 없이도 충분히 가벼움. 트래픽이 커지면 이후 materialized view로 전환 검토.
- 순업보트 표시값(`net_upvotes` 계열)은 **원본 Upvote/Downvote 수를 별도 보존**(`upvote_count`, `downvote_count`) — 콜드스타트 실드(최초 2시간 다운보트 50% 가중)는 Hot Score 정렬 계산에만 내부적으로 적용하고, 화면에 노출되는 순업보트 수치는 항상 정확한 Upvote−Downvote로 유지(기획서 2-1 "지표 단일화" 원칙 준수).
- 댓글 베스트/접힘/1-Click 상태 등은 **스키마에 플래그를 두지 않고 조회 시점에 계산**(net_upvotes ≥ +10 → 베스트, ≤ −5 → 접힘). 값이 바뀔 때마다 별도 갱신 로직이 필요 없어 단순함.
- 유저 플레어는 별도 테이블이 아니라 `profiles.user_flair` 컬럼으로 처리(카탈로그가 아닌 자유입력 1인 1값).
- 게시글/댓글 삭제는 소프트 삭제(`is_deleted`)로 처리 — 대댓글·투표 참조 무결성 보존, 화면에는 "삭제된 게시글/댓글입니다" 표시.
- 이미지는 `text[]` 배열 컬럼으로 저장(최대 5장 고정 상한이라 별도 테이블 정규화 이득이 적음).

---

## 1. 룸/플레어 시드 데이터

### rooms (6개 고정)

| code | name | subtitle |
|---|---|---|
| `jachwi` | 자취룸 | 월세·공과금·생필품 절약! 1인 가구 고정비 방어 |
| `c_expense` | C발비용 | 홧김 소비·감정 지출 방어! 사기 전 참반 투표 |
| `food_saving` | 식비절약 | 냉파부터 배달 방어까지! 식비 줄이는 꿀조합 |
| `tikkeul` | 티끌모으기 | 예적금·앱테크·소액 투자로 절약액 시드 만들기 |
| `worklife` | 직장생활 | 첫 월급 관리·연봉 고민, 회사 밖 직장 짠내 썰 |
| `free_chat` | 짠수다 | 카테고리 구분 없이 자유롭게 나누는 소소한 수다 |

### post_flairs (룸당 4개, 총 24개)

투표형 4종(★)은 `show_ratio_bar=true` + `has_one_click_action=true`.

| 룸 | 플레어 | ↑ / ↓ 문구 | 1-Click |
|---|---|---|---|
| 자취룸 | 자취꿀팁 | 추천 / 비추 | - |
| 자취룸 | 고정비방어 | 잘했다 / 아쉽다 | - |
| 자취룸 | 생필품득템 | 꿀정보 / 뒷북 | - |
| 자취룸 | ★살까말까 | 사라 / 참아라 | 지출 방어 완료 / 구매 완료 |
| C발비용 | ★사도될까 | 사라 / 참아라 | 지출 방어 완료 / 구매 완료 |
| C발비용 | 지출평가 | 인정 / 낭비 | - |
| C발비용 | 참기성공 | 칭찬해 / 부럽다 | - |
| C발비용 | 홧김썰 | 토닥토닥 / 정신차려 | - |
| 식비절약 | 냉파레시피 | 추천 / 비추 | - |
| 식비절약 | 편의점꿀조합 | 맛도리 / 별로 | - |
| 식비절약 | 배달방어 | 승리 / 패배 | - |
| 식비절약 | 장보기득템 | 꿀정보 / 비싸다 | - |
| 티끌모으기 | 짠돈예적금 | 추천 / 비추 | - |
| 티끌모으기 | 앱테크 | 꿀정보 / 막힘·중단 | - |
| 티끌모으기 | 시드모으기 | 응원해 / 도망쳐 | - |
| 티끌모으기 | 소액투자 | 추천 / 비추 | - |
| 직장생활 | 회사질문 | 추천 / 비추 | - |
| 직장생활 | ★이직 | 찬성 / 반대 | 이직 결정 완료 / 회사 잔류 결정 |
| 직장생활 | 월급관리 | 훌륭해 / 무리수 | - |
| 직장생활 | 직장짠내썰 | 토닥토닥 / 정신차려 | - |
| 짠수다 | 자유수다 | 추천 / 비추 | - |
| 짠수다 | 짠내/하소연 | 토닥토닥 / 정신차려 | - |
| 짠수다 | 소소고민 | 이렇게 해 / 저렇게 해 | - |
| 짠수다 | ★룸 제안 | 찬성 / 반대 | 제안 전달/반영 완료 (단일 옵션) |

---

## 2. 테이블 스키마

### `rooms`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| code | text | unique, not null |
| name | text | not null |
| subtitle | text | not null |
| display_order | int | unique, not null |
| created_at | timestamptz | default now() |

### `post_flairs`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| room_id | uuid | FK → rooms(id), not null |
| code | text | not null |
| label | text | not null |
| vote_up_label | text | not null, default '추천' |
| vote_down_label | text | not null, default '비추' |
| show_ratio_bar | boolean | not null, default false |
| has_one_click_action | boolean | not null, default false |
| action_label_a | text | nullable |
| action_label_b | text | nullable (룸 제안처럼 단일 옵션이면 null) |
| display_order | int | not null |
| — | — | unique(room_id, code), unique(room_id, display_order) |

### `profiles` (기존 테이블 변경)
- **삭제**: `onboarding_niche`, `current_streak`, `longest_streak`, `last_post_date` (니치/스트릭 폐기)
- **추가**:

| 컬럼 | 타입 | 제약 |
|---|---|---|
| user_flair | text | nullable, check char_length(user_flair) <= 5 |
| notify_vote_feedback | boolean | not null, default true |
| notify_comment_reply | boolean | not null, default true |
| notify_monthly_badge | boolean | not null, default true |
| default_room_id | uuid | FK → rooms(id), nullable (설정 > 룸 탭 기본 룸 지정) |

### `posts`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles(id), not null |
| room_id | uuid | FK → rooms(id), not null |
| flair_id | uuid | FK → post_flairs(id), not null |
| title | text | not null, char_length >= 2 |
| body | text | not null (공백제외 10자 이상은 앱 레벨 검증) |
| one_line_question | text | nullable (투표형 플레어 전용, 선택 입력) |
| image_urls | text[] | nullable, 최대 5장, 1번째=대표 썸네일 |
| upvote_count | int | not null, default 0 |
| downvote_count | int | not null, default 0 |
| author_action_value | text | nullable, check in ('a','b') |
| author_action_completed_at | timestamptz | nullable |
| comment_count | int | not null, default 0 (캐시) |
| is_deleted | boolean | not null, default false |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |
| — | 인덱스 | (room_id, created_at desc), (created_at desc), (user_id) |

### `comments`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| post_id | uuid | FK → posts(id), not null |
| parent_comment_id | uuid | FK → comments(id), nullable (1-depth만 허용, 앱에서 검증) |
| user_id | uuid | FK → profiles(id), not null |
| mentioned_nickname | text | nullable (대댓글의 대댓글 시 @멘션 자동삽입용) |
| body | text | not null |
| upvote_count | int | not null, default 0 |
| downvote_count | int | not null, default 0 |
| is_deleted | boolean | not null, default false |
| created_at | timestamptz | default now() |
| — | 인덱스 | (post_id, parent_comment_id, created_at) |

### `votes`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| target_type | text | not null, check in ('post','comment') |
| target_id | uuid | not null |
| user_id | uuid | FK → profiles(id), not null |
| value | smallint | not null, check in (-1, 1) — 취소는 row 삭제로 표현 |
| created_at | timestamptz | default now() |
| — | 제약 | unique(target_type, target_id, user_id) |
| — | 인덱스 | (target_type, target_id) |

트리거: `votes` INSERT/UPDATE/DELETE 시 `posts.upvote_count`/`downvote_count` 또는 `comments.upvote_count`/`downvote_count`를 즉시 갱신(Δ 반영, 기획서 2-6 스펙).

### `bookmarks`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles(id) |
| post_id | uuid | FK → posts(id) |
| created_at | timestamptz | default now() |
| — | 제약/인덱스 | unique(user_id, post_id), index(user_id, created_at desc) |

### `drafts`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles(id), **unique** (유저당 1개) |
| room_id | uuid | FK → rooms(id), nullable |
| flair_id | uuid | FK → post_flairs(id), nullable |
| title | text | nullable |
| body | text | nullable |
| one_line_question | text | nullable |
| image_urls | text[] | nullable |
| updated_at | timestamptz | default now() |
| expires_at | timestamptz | not null (작성 당일 24:00 KST) |

### `monthly_badges`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| year_month | text | not null (예: '2026-08') |
| scope | text | not null, check in ('room','global') |
| room_id | uuid | FK → rooms(id), nullable (scope='global'이면 null) |
| category | text | not null, check in ('post','comment') |
| rank | smallint | not null, check in (1,2,3) |
| user_id | uuid | FK → profiles(id), not null |
| score | int | not null (스냅샷 당시 순업보트) |
| created_at | timestamptz | default now() |
| — | 제약 | unique(year_month, scope, room_id, category, rank) |

### `blacklist_words`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| word | text | unique, not null |
| category | text | not null (사칭/성적/정치혐오/욕설/광고/시스템예약어) |
| created_at | timestamptz | default now() |

PDF 부록의 금지어 리스트 전체를 초기 시드로 인서트. 서버 액션에서 부분문자열 검사 + 공백/특수문자 제거 정규화 검사 2단계로 검증(기획서 7-4).

### `notifications`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles(id), not null |
| type | text | not null, check in ('vote_feedback','comment_reply','monthly_badge') |
| payload | jsonb | not null (post_id/comment_id/배지정보 등) |
| is_read | boolean | not null, default false |
| created_at | timestamptz | default now() |
| — | 인덱스 | (user_id, is_read, created_at desc) |

---

## 3. Hot Score 계산 (SQL 함수 초안)

```sql
-- Raw Hot Score (룸 피드용)
create or replace function raw_hot_score(
  p_upvotes int, p_downvotes int, p_created_at timestamptz
) returns numeric as $$
  select (
    (p_upvotes - case
      when now() - p_created_at <= interval '2 hours' then p_downvotes * 0.5
      else p_downvotes
    end) + 1
  ) / power(
    extract(epoch from (now() - p_created_at)) / 3600 + 2, 1.2
  );
$$ language sql immutable;

-- Popular Hot Score = (Raw + best_comment_score*0.3) * W_room
-- W_room = clamp(전체 룸 48h 평균 글수 / 해당 룸 48h 글수, 0.5, 2.0)
```

- 인기 피드/룸 피드 모두 **작성 후 48시간 경과 글은 정렬 대상에서 제외**(최신순 정렬에는 계속 노출, 인기순에서만 제외).
- 화면에 노출되는 "순업보트" 숫자는 `upvote_count - downvote_count` 그대로(콜드스타트 가중 미반영).

---

## 4. 확인 필요 항목

1. **룸 피드 상태 유지(3-3)**: 마지막 선택 룸/정렬/플레어 상태를 DB(`profiles`)에 저장할지, 클라이언트 `localStorage`로 처리할지. → **localStorage 추천** (서버 부담 없음, 기기 간 동기화 요구사항 없음).
2. **콜드스타트 실드가 화면 표시 수치에도 적용되는지**: 원문 "다운보트 가중치를 50%만 적용"이 화면에 보이는 순업보트 숫자까지 낮추는 건지, Hot Score 정렬 계산에만 내부적으로 쓰이는 건지 원문상 약간 모호함 → **정렬에만 적용, 화면 숫자는 정확한 값 유지**로 설계했는데 이견 있으면 알려줘.
3. **W_room 계산 방식**: 쿼리 타임 실시간 집계로 우선 설계했는데, 트래픽이 늘면 성능 이슈 가능 → 지금은 이대로 가고 이후 필요 시 캐시 테이블 추가.
4. **아이콘 파일**: `all_icons_260801.html`이 채팅에는 업로드됐고, 워크스페이스 폴더에도 이제 반영됐어 — 확인해서 아이콘 ID 매핑표(부록 페이지 38) 그대로 적용할게. 스키마와는 무관하니 별도 처리.

문제없으면 이 스키마로 마이그레이션 적용 들어갈게.
