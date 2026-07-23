# 짠메이트 (jjanmate-app)

절약 챌린지 니치 커뮤니티 "짠메이트"의 MVP 코드 스캐폴딩입니다. 기획서·로드맵·ERD·schema.sql은 프로젝트 지식 문서를 참고하세요. 이 폴더는 화면 골격(온보딩→매칭프리뷰→로그인→게시→피드)만 잡아둔 시작점이고, 실제 DB 연동·카카오 로그인·AI 태깅은 아직 TODO 상태입니다.

## 0. 시작 전 준비물 (컴퓨터에 없다면 먼저 설치)

1. **Node.js** (LTS 버전): https://nodejs.org 에서 설치. 설치 후 터미널에서 `node -v` 쳤을 때 버전이 나오면 완료.
2. **Git**: https://git-scm.com/downloads 에서 설치. `git --version`으로 확인.
3. **코드 편집기**(선택, 추천): VS Code — https://code.visualstudio.com

## 1. 로컬에서 실행해보기

터미널(맥은 터미널 앱, 윈도우는 PowerShell)에서 이 폴더로 이동한 뒤:

```bash
npm install
cp .env.local.example .env.local
```

`.env.local` 파일을 열어서 Supabase 값(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)을 채워 넣으세요. 이 값은 Supabase 대시보드 → 프로젝트(`TaronPark's MVP`) → Project Settings → API 페이지에서 그대로 복사하면 됩니다. 카카오/Claude API 키는 아직 없어도 실행에는 지장 없습니다(1~2주차, 3주차에 채우면 됨).

그다음 실행:

```bash
npm run dev
```

브라우저에서 http://localhost:3000 열면 랜딩 화면이 보입니다.

## 2. GitHub에 올리기

1. https://github.com/new 에서 새 저장소 생성 (이름 예: `jjanmate`, Private 추천). README/​gitignore는 추가하지 않고 "Create repository"만 누르세요 (이미 이 폴더에 있음).
2. 터미널에서 이 폴더 안으로 이동한 뒤:

```bash
git init
git add .
git commit -m "chore: 초기 스캐폴딩 (온보딩/프리뷰/로그인/게시/피드 골격)"
git branch -M main
git remote add origin <GitHub에서 복사한 저장소 URL>
git push -u origin main
```

3. `<GitHub에서 복사한 저장소 URL>`은 새로 만든 저장소 페이지의 "Quick setup"에 나오는 `https://github.com/아이디/jjanmate.git` 형태 주소입니다.
4. push할 때 GitHub 로그인을 요구하면, 브라우저 인증 창이 뜨는 대로 로그인하면 됩니다 (Git 최신 버전은 보통 자동으로 브라우저 인증을 띄웁니다).

## 3. 폴더 구조

```
docs/                    기획서/로드맵/ERD/schema.sql 사본 (2026-07-23 추가)
                          — VSCode·Claude Code 등 어떤 도구로 열어도
                          기획 배경과 판단 근거를 파일에서 바로 읽을 수 있도록
                          레포 안에 넣어둠. 원본(최신본)은 Cowork 프로젝트 지식에 있으니
                          기획 변경 시 두 곳 다 갱신 필요.
app/
  page.tsx              랜딩 (비회원 피드 미리보기) — 4-A 1번
  onboarding/page.tsx    니치 선택 — 4-A 2번
  preview/page.tsx       매칭 프리뷰 — 4-A 3번
  login/page.tsx         카카오 로그인 (스켈레톤) — 4-A 4번
  post/page.tsx          게시 작성 + AI 처리중 화면 — 4-A 4번, 4-C
  feed/[niche]/page.tsx  태그 피드(룸 타이틀/스트릭/리액션) — 4-B
lib/
  niches.ts   니치 코드<->표시명·룸이름 매핑 (여기만 고치면 화면 이름 전부 바뀜)
  types.ts    schema.sql과 대응하는 타입 정의
  supabase.ts Supabase 클라이언트 초기화
```

## 4. 다음 작업 (로드맵 1~2주차 기준)

- [ ] DB 테이블 실제 생성 (schema.sql, `reactions` 테이블 포함 마이그레이션)
- [ ] 카카오 개발자 앱 등록 → Supabase Auth Kakao Provider 연동 → `login/page.tsx` 실제 로그인 처리로 교체
- [ ] `app/page.tsx`, `feed/[niche]/page.tsx`를 실제 `posts` 테이블 조회로 교체
- [ ] `post/page.tsx`의 게시 처리를 실제 insert + 3주차 AI 태깅 파이프라인 연동으로 교체

각 TODO 주석 위치는 코드 안에 `TODO(n주차)` 형태로 표시해뒀습니다.
