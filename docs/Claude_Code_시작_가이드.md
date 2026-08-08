# Claude Code 시작 가이드 (짠메이트 프로젝트, Windows 기준)

Claude Code를 처음 써보는 분을 위한 체크리스트입니다. 위에서부터 순서대로 따라오면 됩니다.
막히는 단계가 있으면 그 단계까지만 하고 캡처해서 물어보세요 — 한번에 다 안 되도 괜찮습니다.

---

## 0. 시작 전 확인

Claude Code는 **Claude Pro/Max/Team/Enterprise 구독 중 하나가 있어야** 로그인됩니다. 무료 claude.ai 계정만으로는 안 됩니다.
(구독이 없다면 https://claude.com/pricing)

---

## 1단계: 설치

**PowerShell**(윈도우 검색창에 "PowerShell" 입력해서 실행)을 열고 아래 한 줄을 붙여넣고 Enter:

```powershell
irm https://claude.ai/install.ps1 | iex
```

- 관리자 권한(우클릭 → 관리자 권한으로 실행) 필요 없습니다. 그냥 일반 PowerShell이면 됩니다.
- 이 방식(네이티브 설치)은 이후 업데이트가 자동으로 이루어져서 별도로 신경 쓸 게 없습니다.
- (선택, 추천) [Git for Windows](https://git-scm.com/downloads/win)를 설치해두면 Claude Code가 Bash 도구를 쓸 수 있어서
  더 매끄럽게 동작합니다. 이미 Git을 쓰고 계시다면 이미 설치되어 있을 가능성이 높습니다.

설치가 끝나면 확인:

```powershell
claude --version
```

버전 번호(예: `2.1.211 (Claude Code)`)가 뜨면 성공입니다.

---

## 2단계: 로그인

아무 폴더에서나 아래 명령을 치면 됩니다:

```powershell
claude
```

처음 실행하면 브라우저 창이 자동으로 뜨고 로그인 화면이 나옵니다. claude.ai 로그인하던 계정으로 로그인하면 됩니다.
브라우저가 자동으로 안 뜨면 터미널에서 `c` 키를 눌러 로그인 URL을 복사한 뒤 브라우저에 붙여넣으세요.
터미널에 "Login successful"이 뜨면 완료.

---

## 3단계: 짠메이트 프로젝트 폴더에서 열기

```powershell
cd "C:\Users\dapar\OneDrive\Desktop\Taron.Park\jjanmate-app"
claude
```

이렇게 하면 Claude Code가 이 폴더를 프로젝트로 인식하고, **레포 루트에 있는 `CLAUDE.md`를 자동으로 읽어들입니다.**
(이번에 같이 만들어 둔 파일입니다 — 서울 리전 이전 이력, DB 함정, 겪었던 에러들이 정리되어 있어서 매번 처음부터
설명 안 해도 Claude Code가 이어서 작업할 수 있습니다.)

세션이 시작되면 아무 질문이나 던져서 CLAUDE.md 내용을 알고 있는지 확인해보세요. 예:

```
지금 어느 Supabase 프로젝트가 프로덕션이야?
```

"egutchfhvysqclxgyixj(서울)"이라고 답하면 정상적으로 컨텍스트를 읽은 것입니다.

---

## 4단계: 안전모드(Permission Mode) 이해하기 — 장시간 작업 맡길 때 특히 중요

Claude Code는 파일을 고치거나 명령을 실행하기 전에 기본적으로 매번 허락을 구합니다. 이 "허락 구하는 정도"를 모드로 조절할 수 있습니다.

| 모드 | 동작 | 언제 쓰나 |
|---|---|---|
| `default` (기본값) | 도구를 처음 쓸 때마다 승인 요청 | 처음 며칠, 익숙해지기 전까지는 이 모드로 두는 걸 추천 |
| `plan` | 읽기/탐색만 하고 파일은 안 고침 | "일단 계획만 짜줘, 코드는 아직 건들지 마" |
| `acceptEdits` | 파일 수정은 자동 승인, 그 외는 물어봄 | 코드 수정은 믿고 맡기되 위험한 명령은 확인받고 싶을 때 |
| `auto` | 백그라운드 안전 검사를 거쳐 대부분 자동 승인 | 여러 단계짜리 작업을 어느정도 믿고 맡길 때 (권장) |
| `bypassPermissions` | 전부 무조건 자동 승인, 안전검사 없음 | **비추천.** 격리된 샌드박스 환경이 아니면 쓰지 마세요 |

**권장**: 처음에는 `default`로 시작해서 Claude Code가 뭘 하는지 감을 잡고, 익숙해지면 여러 단계 작업(예: "이 버그 찾아서 고치고 테스트까지 돌려줘")을
맡길 때만 `auto` 모드 + 필요한 명령만 허용하는 규칙을 조합해서 쓰세요. `bypassPermissions`는 실수로 DB를 지우거나 잘못된 명령을
그대로 실행할 위험이 있어서, 이 프로젝트처럼 실제 운영 중인 DB(Supabase)를 만지는 경우엔 특히 권장하지 않습니다.

세션 중에 `/permissions`를 치면 현재 모드와 허용/차단 규칙을 확인·수정할 수 있습니다.

---

## 5단계: Matt Pocock Skills 설치 (추천 — 가볍고 바로 도움됨)

TypeScript/Next.js 프로젝트에서 Claude Code가 흔히 저지르는 실수(요청 오해, 불필요하게 장황한 코드, 동작 안 하는 코드,
설계 부실)를 잡아주는 스킬 모음입니다. 짠메이트 스택(Next.js 16 + TypeScript)과 잘 맞습니다.

Claude Code 세션 안에서 아래처럼 말하면 됩니다 (터미널에 직접 치는 명령이 아니라, `claude` 실행 후 대화창에 입력):

```
npx skills@latest add mattpocock/skills 실행해서 Matt Pocock Skills 설치해줘
```

또는 공식 마켓플레이스를 통해서:

```
claude plugins install mattpocock-skills
```

설치 후 세션 안에서:

```
/setup-matt-pocock-skills
```

를 실행하면 프로젝트에 맞게 설정을 마무리해줍니다. (설치 도중 뭔가 승인을 물어보면, 이 스킬은 신뢰할 수 있는 공개
저장소(github.com/mattpocock/skills)이므로 승인해도 됩니다.)

---

## 6단계 (선택, 나중에 해도 됨): Gstack — 다인원 가상 개발팀 구성

23개 역할(기획 리뷰/디자인 리뷰/QA/보안 감사/릴리즈 등)을 슬래시 명령으로 제공하는 좀 더 무거운 도구입니다.
**처음부터 설치할 필요는 없습니다.** 5단계까지만으로도 당분간 개발엔 충분하고, 나중에 "AI한테 QA나 보안 감사까지
맡기고 싶다"는 생각이 들 때 아래처럼 설치하면 됩니다.

⚠️ Windows 참고: Git Bash 또는 WSL이 필요하고, `bun`과 `node`가 둘 다 PATH에 있어야 합니다(Windows에서 알려진 Bun 버그
때문에 일부 기능이 Node로 대체 실행됨). 그래서 5단계보다 설치 난이도가 조금 있습니다.

Claude Code 세션 안에서:

```
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

혼자 개발 중이므로 `--team` 옵션(여러 명이 같은 레포 쓸 때 자동 업데이트 강제하는 옵션)은 지금은 필요 없습니다.
설치 후 자주 쓰게 될 명령: `/office-hours`(요구사항 정리), `/autoplan`(계획 수립), `/review`(코드 리뷰), `/ship`(배포 준비),
`/qa`(브라우저로 실제 동작 확인).

---

## 자주 쓰는 명령어 모음

| 명령 | 용도 |
|---|---|
| `claude` | 현재 폴더에서 세션 시작 |
| `claude --version` | 설치 확인 |
| `claude doctor` | 설치/설정 문제 진단 |
| `claude update` | 수동 업데이트 |
| `/permissions` (세션 중) | 권한 모드/규칙 확인·수정 |
| `/login`, `/logout` (세션 중) | 재로그인 / 로그아웃 |

---

## 막히면

- `claude doctor`를 먼저 실행해서 나오는 메시지를 그대로 캡처해서 보여주세요.
- 로그인이 안 되면 Pro/Max/Team/Enterprise 구독이 활성 상태인지 먼저 확인하세요 (무료 플랜은 Claude Code 미지원).
- 이 프로젝트의 배경 지식이 필요한 질문(왜 이렇게 만들었는지, DB 구조 등)은 Claude Code한테 바로 물어보면 됩니다 —
  레포 루트의 `CLAUDE.md`와 `docs/` 폴더를 읽고 답할 수 있습니다.
