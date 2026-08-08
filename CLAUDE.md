# CLAUDE.md — 짠메이트(jjanmate-app) 프로젝트 컨텍스트

이 파일은 Claude Code가 세션 시작 시 자동으로 읽는 파일입니다. 대화를 압축(compact)하거나 새 세션을 시작해도
여기 적힌 내용은 매번 다시 로드되므로, 반복 설명 없이 바로 이어서 작업할 수 있게 하는 것이 목적입니다.
**새로운 결정/사고/트러블슈팅이 생기면 이 파일도 같이 갱신해주세요.** (Claude Code에게 "이번에 알아낸 내용 CLAUDE.md에 추가해줘"라고 요청하면 됩니다.)

## 프로젝트 한 줄 요약

절약 챌린지 니치 커뮤니티 "짠메이트". Reddit 스타일 게시글/댓글/투표 + 카카오 로그인 전용 MVP.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router), React 19
- **DB/Auth/Storage**: Supabase (Postgres, GoTrue Auth, Storage)
- **배포**: Vercel (Hobby 플랜 — 리전 1개만 지정 가능)
- **로그인**: 카카오 OAuth 단일 방식 (2026-07-21 확정, 이메일/기타 소셜 없음)
- **패키지 매니저**: npm

## 저장소 구조

```
app/        Next.js App Router 페이지 (랜딩/온보딩/프리뷰/로그인/게시/피드)
lib/        Supabase 클라이언트, 타입, 니치 매핑 등 공용 로직
docs/       기획서·로드맵·ERD·schema.sql·운영 이슈트래커 등 (파일명이 문서 내용을 그대로 설명함)
.env.local.example   필요한 환경변수 목록 + 각 변수 설명 (주석 꼼꼼히 되어있음, 실제 값은 .env.local에 별도 보관·gitignore됨)
```

`docs/` 안의 문서들은 실제 기획 배경과 판단 근거가 담겨 있으니, 기능을 만들기 전에 관련 문서가 있는지 먼저 확인하세요.
특히 `짠메이트_DB_스키마_설계_v2.md`, `짠메이트_DB설계_ERD.md`, `schema.sql`, `짠메이트_운영_이슈트래커_v2.md`.

## 인프라 현황 (2026-08-07 기준, 매우 중요)

**2026-08-07에 Supabase 프로젝트를 싱가포르 리전 → 서울(icn1) 리전으로 이전 완료.** Vercel Function 리전도 icn1로 맞춰서, 이전에 있던
"Vercel(미국 동부)↔DB(싱가포르)" 이중 대륙간 왕복 지연이 사라졌습니다. 로그인 확인 완료, 정상 운영 중.

- **현재 운영 중(New, Seoul)**: Supabase 프로젝트 ref `egutchfhvysqclxgyixj` — 이게 지금 프로덕션입니다.
- **구 프로젝트(Old, Singapore)**: 프로젝트 ref `tmawuxjllizzixancfyg` — Kakao Provider는 비활성화(Disabled) 처리했지만
  프로젝트 자체는 아직 남아있음. 당분간 백업용으로 유지, 완전히 필요 없어지면 pause/삭제 검토.
- ✅ (2026-08-08 해결) `.env.local`과 `.env.local.example`의 `NEXT_PUBLIC_SUPABASE_URL`이 리전 이전(8/7) 이후에도 계속
  구 프로젝트(tmawuxjllizzixancfyg)를 가리키고 있던 것을 발견하고 새 프로젝트(egutchfhvysqclxgyixj) 기준으로 갱신함.
  `.env.local.example`은 템플릿이라 anon/service_role 키는 그대로 플레이스홀더 문구 유지, URL만 교체.
  실제 비밀값이 들어가는 `.env.local`은 gitignore 대상이라 이 파일 자체에는 값을 적지 않음.
- ✅ (2026-08-08 해결) Vercel 프로덕션의 `SUPABASE_SERVICE_ROLE_KEY`도 리전 이전 때 같이 안 바뀌고 구 프로젝트 키로 남아있던 것을
  발견해 새 프로젝트 키로 교체·재배포함. 상세 경위는 `docs/짠메이트_운영_이슈트래커_v2.md` 4번 항목 참고 — **리전/프로젝트
  이전 작업 후에는 "로그인 됐다"만으로 안심하지 말고 service_role 키·로컬 `.env.local`·Storage 파일까지 별도로 점검할 것.**

## 겪었던 함정들 (Auth/마이그레이션) — 다시 겪지 않기 위한 기록

1. **Supabase Auth Provider는 프로젝트마다 별도 설정.** 구 프로젝트에서 Kakao를 켜놨어도 새 프로젝트에는 자동으로 안 옮겨짐.
   Authentication → Providers에서 새 프로젝트에 Kakao Client ID/Secret을 다시 넣어야 함. 안 하면
   `{"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}` 에러.
2. **Redirect URLs 허용목록이 비어있으면 로그인 후 `localhost`로 튕김 (`ERR_CONNECTION_REFUSED`).**
   Site URL만 맞춰놓는 걸로는 부족하고, Authentication → URL Configuration → Redirect URLs에
   `https://jjanmate.vercel.app/auth/callback`을 명시적으로 추가해야 함.
3. **GoTrue(Supabase Auth) 마이그레이션 시 `auth.users`의 토큰 컬럼들이 `NULL`이면 안 되고 빈 문자열(`''`)이어야 함.**
   `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`,
   `phone_change`, `phone_change_token`, `reauthentication_token` — 이 중 하나라도 NULL이면 GoTrue Go 코드가
   "converting NULL to string is unsupported"로 죽고, 프론트에서는 그냥 `server_error`로만 보임(원인 파악 어려움).
   데이터를 다른 프로젝트로 옮길 때는 이 8개 컬럼을 `COALESCE(컬럼, '')`로 반드시 채워줄 것.
4. 로그인 버튼이 "반응 없음"처럼 보여도 실제로는 카카오 인증까지는 성공하고 Supabase 콜백 단계에서 조용히 실패하는 경우가 있음
   (에러가 alert 없이 그냥 /login으로 리다이렉트됨). 디버깅할 때는 Chrome DevTools Network 탭에서
   `/auth/v1/authorize` → 카카오 → `/auth/v1/callback` 흐름 전체를 추적해야 진짜 원인이 보임.
5. **로그인 관련 코드/설정을 건드릴 때 주의**: 이 레포에는 카카오 로그인 흔적이 두 가지 있습니다.
   - `.env.local.example`의 `KAKAO_REST_API_KEY` / `KAKAO_REDIRECT_URI` + (README에 언급된) 커스텀
     `app/api/auth/kakao/callback` 스켈레톤 — 초기 스캐폴딩 단계의 구현 방식으로 보임.
   - 실제로 프로덕션에서 동작이 **확인된 것은 Supabase Auth 내장 Kakao Provider** 방식(Authentication → Providers,
     `/auth/v1/authorize` → `/auth/v1/callback` 흐름)입니다.
   둘 중 어느 게 실제로 쓰이고 있는지 코드(`app/login/page.tsx`, `middleware.ts` 등)를 먼저 확인한 뒤 작업하세요.
   커스텀 스켈레톤이 죽은 코드라면 정리 대상일 수 있습니다.
6. **DB 행 마이그레이션은 스토리지 파일까지 같이 옮겨주지 않음.** 리전 이전(8/7) 때 `posts` 등의 행은 새 프로젝트로
   복사됐지만, 그 행이 참조하는 이미지 파일(Storage)은 옮겨지지 않아서 `image_urls`가 구 프로젝트 도메인을 가리키는
   채로 남는 경우가 있었음(예: 8/6에 작성된 게시글 1건, 이미지 2장 — 2026-08-08에 발견해 새 프로젝트 Storage로
   이전 + DB URL 갱신 완료). 구 프로젝트를 나중에 pause/삭제하기 전에 `posts.image_urls`를 구 프로젝트 도메인
   문자열로 전수 검색해서 남은 게 없는지 다시 한번 확인할 것.

## 데이터 모델 핵심 개념

- **`seed_contents_pool` (400행)**: 앱 론칭 시점에 실제로 발행될 콘텐츠 재고입니다. **테스트용 더미 데이터가 아님.**
  `posted_at IS NULL` = 아직 안 쓰인(발행 가능한) 상태. `claim_seed_pool_items(p_room_id, p_limit)` RPC(SECURITY DEFINER)가
  `posted_at IS NULL`인 행을 골라 `posted_at = now()`로 찍어서 클레임함. **`posted_at`을 다시 NULL로 리셋하면 그 콘텐츠는
  "아직 발행 안 된 것"으로 원상복구되어 나중에 다시 클레임될 수 있습니다.** (2026-08-07: 리뷰 테스트용으로 미리 발행됐던
  30건을 삭제 후 `posted_at`을 NULL로 되돌려서 실제 론칭 때 다시 쓸 수 있게 해둠.)
- **`votes` 테이블**: 폴리모픽 구조 (`target_type` text + `target_id` uuid, DB 레벨 FK 없음). `posts`/`comments` 양쪽에 다 씀.
- **시드 유래 게시글 구분법**: `posts`에는 `seed_contents_pool`을 가리키는 FK 컬럼이 없습니다. 구분하려면
  `posts.title = seed_contents_pool.title AND posts.body = seed_contents_pool.body AND posts.user_id = seed_contents_pool.seed_user_id`
  로 content-equality join을 해야 함.
- **FK 의존 관계 (삭제 순서 중요)**: `bookmarks.post_id → posts.id`, `comments.post_id → posts.id`,
  `comments.parent_comment_id → comments.id`(자기참조). `posts`를 지우려면 `bookmarks → votes → comments → posts` 순서로
  지워야 FK violation이 안 남. 새로운 정리 작업 전에는 `information_schema`로 FK를 다시 확인할 것 (스키마가 바뀔 수 있음).
- **가입자 82명 중 실제 카카오 로그인 유저는 소수**이고 나머지는 시드/합성 페르소나입니다. 실사용자 행동을 분석할 때
  합성 페르소나 데이터가 섞이지 않도록 주의.
- **`SEED_DRIP_LAUNCH_DATE`**: 이 값이 없으면 시드 드립 크론(`app/api/cron/seed-drip`)이 "런칭일 미설정"으로 즉시 종료함
  (오늘 날짜로 fallback하지 않음, 의도된 안전장치). 실제 CBT 시작 시점에 Vercel 환경변수로 채워 넣으면 그 순간부터 1일차로 카운트.

## Claude Code로 작업할 때 유의사항

- 이 프로젝트는 원래 Cowork(Claude 데스크톱 앱의 코워크 모드)에서 개발되다가 Claude Code로 전환한 프로젝트입니다.
  과거 대화 이력이 압축(compact)되면서 디테일이 소실된 적이 있어서(`seed_contents_pool`을 테스트 데이터로 오판했던 사례),
  대화 압축에 의존하지 말고 이 파일에 결정사항을 기록하는 방식으로 전환했습니다. 새로운 판단 근거/실수/교훈이 생기면 여기에 추가하세요.
- Supabase 프로젝트가 2개(구/신) 존재하니, MCP나 CLI로 Supabase를 조작하기 전에 **어느 프로젝트 ref를 대상으로 하는지 항상 재확인**하세요.
- 실 사용자 데이터(특히 `posts`, `comments`, `votes`, `bookmarks`)를 삭제/수정하는 작업은 되돌리기 어려우니, 실행 전에
  대상 행을 SELECT로 먼저 보여주고 사용자 확인을 받은 뒤 진행하는 습관을 유지하세요.
- 장시간(몇 시간 단위) 무인 작업을 맡길 때는 `bypassPermissions` 모드보다 `auto` 모드 + 명시적 allow/deny 규칙 조합을 권장합니다
  (자세한 이유는 `docs/Claude_Code_시작_가이드.md` 참고).

## 작업 방식 전환 (2026-08-08 결정)

- **2026-08-09부터 실제 앱 기능 개발은 VS Code + Claude Code(VS Code 확장)로 진행.** 그 전까지는 Cowork(Claude 데스크톱 앱)에서
  인프라 셋업/스캐폴딩을 진행해왔고, 이 시점부터가 "진짜 기능 구현" 단계의 시작. 사용자는 Claude Code를 처음 써봐서, 터미널
  CLI보다 VS Code 확장(그래픽 diff 리뷰, Plan 모드 마크다운 미리보기, 체크포인트/되감기 기능)으로 시작하기로 함.
- **역할 분리**: Cowork(이 프로젝트)는 "뭘·왜·어떤 순서로" 결정하는 기획/판단 레이어, VS Code의 Claude Code는 "어떻게
  구현하는지" 실행 레이어로 쓰기로 함. 초반(사용자가 Claude Code에 익숙해지기 전)에는 이 방식을 유지하되, 익숙해지면
  점점 "다음에 뭘 할지"도 Claude Code 세션 안에서 직접 판단하게 넘길 예정 (Claude Code가 실제 코드/로드맵을 직접
  볼 수 있어 더 구체적인 제안이 가능하기 때문).
- **중요**: Cowork 대화에서 결정된 내용은 자동으로 Claude Code 세션에 전달되지 않습니다(서로 다른 도구). 그래서 Cowork에서
  뭔가 결정되면 그때그때 이 `CLAUDE.md`나 `docs/`의 로드맵 문서에 반영해두는 습관이 필요합니다 — 안 그러면 다음날 Claude Code가
  전날 논의를 모른 채로 시작하게 됨.
- **짠메이트 "운영"(비개발) 업무는 이 코드 레포와 별도의 Cowork 프로젝트로 분리하기로 결정.** 이슈 추적, 시드콘텐츠 드립
  모니터링, 일일 운영 기록 등을 다룰 예정이며, `do-better-workspace-v2`(github.com/Rhim80/do-better-workspace-v2, PKM
  워크스페이스 템플릿)를 참고해서 구조를 잡기로 함. **아직 그 프로젝트 자체는 생성 전 상태**이고, 세부 폴더/루틴은 앱 개발이
  어느 정도 진행된 뒤 확정하기로 함(현재는 앱 개발 자체가 막 시작되는 시점이라 필요한 구조를 예측하기 어려움). 프로젝트
  이름은 "짠메이트 운영 워크스페이스"로 정했고, 컨텍스트 문서 2개(짠메이트 개요, do-better-workspace-v2 참고자료)를 미리
  준비해둔 상태. 이 코드 레포(`jjanmate-app`)에는 운영 워크스페이스 관련 파일을 넣지 않음 — 개발과 운영을 완전히 분리하는 게
  방침.
