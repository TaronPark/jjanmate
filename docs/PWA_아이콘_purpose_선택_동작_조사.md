# PWA 아이콘 `purpose` 선택 동작 조사 (Windows 데스크톱 설치 시 아이콘이 매번 다르게 보이는 문제)

- 조사일: 2026-08-08
- 조사 대상 코드: `app/manifest.ts` (192px 아이콘 `purpose` 미지정=암묵적 `any`, 512px 아이콘 `purpose` 미지정=암묵적 `any`, 512px 아이콘 `purpose: "maskable"`)
- 전제: 서버·서비스워커 캐싱은 이미 배제됨(manifest.webmanifest 및 3개 아이콘 파일이 반복 요청에서 바이트 단위로 동일, ETag도 동일함을 확인). 따라서 남은 용의선은 **클라이언트(Chromium) 쪽 아이콘 선택 로직**.
- 조사 방법: 웹 검색 + 1차 자료(스펙 원문, Chromium 소스/커밋, 공식 개발자 문서, 버그 트래커) 직접 fetch. 학습 데이터 기억에 의존하지 않고 실시간 확인.

---

## 1. 스펙: `purpose` 멤버와 아이콘 선택 알고리즘

### 1-1. 현재 권위 있는 스펙은 어디인가 (W3C vs WHATWG)

조사 결과, **Web App Manifest 스펙은 현재도 W3C가 관리하며, WHATWG로 이관된 사실은 확인되지 않았다.**

- 공식 발행판(TR): <https://www.w3.org/TR/appmanifest/> — fetch 시점 기준 **W3C Working Draft, 발행일 2026-07-23**, 발행 주체는 **W3C Web Applications Working Group**으로 명시되어 있음.
- 살아있는 편집자 초안(living/editor's draft): <https://w3c.github.io/manifest/> — 커밋마다 갱신되는 개발 버전으로, TR판보다 최신 논의를 반영.
- 참고로 별도 모듈인 <https://www.w3.org/TR/manifest-app-info/> (Web App Manifest - Application Information)도 존재하지만, `icons`/`purpose` 멤버의 정의는 이 문서가 아니라 **`appmanifest` 본체 문서**에 있음(직접 fetch로 확인).
- 이 스펙은 원래 WICG(Web Platform Incubator Community Group)에서 인큐베이션되어 W3C Web Applications Working Group(과거 WebApps WG → Web Platform WG → 다시 WebApps WG로 이름이 바뀌는 재편이 있었음)으로 이관된 이력은 있으나, **WHATWG 소속으로 넘어간 정황은 검색으로 찾지 못했다.** (참고: <https://www.w3.org/standards/history/appmanifest/>, <https://www.w3.org/2022/04/webapps-wg-charter.html>)

**결론: "W3C에서 WHATWG로 이관됐다"는 전제는 이번 조사에서 뒷받침되지 않음 — 확인 안 됨(오히려 반대 증거: 여전히 W3C 소관).** 작업 시 참조할 URL은 `https://www.w3.org/TR/appmanifest/`(공식 발행판) 또는 `https://w3c.github.io/manifest/`(최신 편집자 초안)이 맞다.

### 1-2. `purpose` 멤버 정의

`https://www.w3.org/TR/appmanifest/` 및 `https://w3c.github.io/manifest/` 본문에서 직접 확인한 정의(두 문서 내용 동일):

- `purpose`는 "공백으로 구분된 고유 토큰들의 순서 없는 집합"(unordered set of unique space-separated tokens)이며 허용 값은 3가지:
  - **`any` (기본값)**: "The user agent is free to display the icon where no purpose is required." — 별도로 `purpose`를 명시하지 않은 아이콘은 자동으로 이 값을 갖는다.
  - **`maskable`**: "The image is designed with icon masks and safe zone in mind, such that any part outside the safe zone can safely be masked away."
  - **`monochrome`**: "A user agent can present this icon where a monochrome icon with solid fill is needed." (색상 정보는 버리고 alpha만 마스크로 사용)
- 인식되지 않는 토큰이 있으면 "If none of the stated purposes are recognized, the icon is totally ignored."

### 1-3. 아이콘 "선택 알고리즘"이 스펙에 존재하는가

**존재하지 않는다.** 스펙에는 "이미지의 purpose를 판별하는" 파싱 알고리즘(purpose 토큰을 검증하는 절차)만 있고, **여러 개의 아이콘(서로 다른 purpose/size) 중 어떤 것을 특정 컨텍스트(설치, 홈스크린, 태스크바 등)에 쓸지 고르는 알고리즘은 스펙에 없다.** 스펙 원문이 명시적으로 이 부분을 브라우저 재량으로 위임한다:

> "The list of icons is provided to the user agent, which will choose the most suitable icons for different contexts and placements." (<https://w3c.github.io/manifest/>, <https://www.w3.org/TR/appmanifest/>)

유사하게 shortcuts 관련 서술에도 "How shortcuts are presented ... is at the discretion of the user agent and/or operating system"라는 표현이 반복되어, 이 스펙의 일반적 설계 철학이 **"제공은 스펙이, 선택은 UA가"**라는 것을 알 수 있다.

MDN 문서(<https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons>)도 이를 보조적으로 뒷받침: "The context in which an icon can be used is determined by the browser and the operating system, based on the specified sizes and formats." — "Browsers use these values as hints to determine where and how an icon is displayed." MDN은 2차 자료이지만 스펙의 재량 위임 서술과 결이 같다.

**요약: 스펙 차원에서는 "브라우저가 골라야 한다"까지만 정하고, 구체적으로 `any` vs `maskable` 중 무엇을 언제 쓸지는 전혀 규정하지 않는다.** 즉 두 번의 설치에서 다른 아이콘이 나왔다고 해서 스펙을 어긴 것은 아니며, 그 원인은 전적으로 "브라우저(Chromium)가 재량을 어떻게 구현했는가"에 있다.

---

## 2. Chromium/Chrome Windows 데스크톱 PWA 설치: 결정적(deterministic)인가, 알려진 버그가 있는가

### 2-1. 실제 Chromium 소스: `primary_icon_filter.cc`

Chromium 소스 저장소에서 아이콘 선택 로직을 담당하는 실제 구현을 찾았다:

- 커밋: <https://chromium.googlesource.com/chromium/src/+/30d0dfe985553b6c16a7d02d7df0ee2346c23b0b> (diff: `...%5E!/`)
- 작성자: Dibyajyoti Pal (dibyapal@google.com), **2025-07-11**
- 신규 파일: `chrome/browser/web_applications/icons/primary_icon_filter.cc`(.h)
- 커밋 메시지 제목: **"[Predictable App Update] Implement primary icon algorithm for PWAs"**
- 관련 버그: `Bug: 427566601` (<https://issues.chromium.org/issues/427566601> — 트래커 접근 시 로그인 요구되어 본문 상세는 확인 안 됨. 커밋 메시지에서 참조된 번호만 확인.)

이 커밋에서 확인한 핵심 로직(커밋 diff/코드 주석 인용):

- "Choose a maskable icon on MacOS and ChromeOS, otherwise choose an icon of purpose `any`."
- 이를 위해 `kPreferMaskableIcons` 라는 플래그성 상수가 있고, **macOS·ChromeOS에서만 `true`, 그 외 플랫폼(Windows, Linux 포함)에서는 `false`.**
- Windows처럼 `kPreferMaskableIcons == false`인 플랫폼에서는: 매니페스트의 `icons` 배열을 순회하며 purpose별로 가장 큰(size) 아이콘을 추적하는 map을 만들고, 최종적으로 **`any` purpose 중 가장 큰 아이콘**을 primary icon으로 선택한다. (maskable 256px 이상 우선 조건은 macOS/ChromeOS에만 적용)
- SVG(사이즈 미지정) 아이콘은 최후 fallback으로 512px 취급.
- 적합한 아이콘이 전혀 없으면 앱 이름 첫 글자로 아이콘을 생성하는 기존(legacy) 방식으로 폴백.

**즉, 이 커밋이 반영된 이후의 Chrome에서는 Windows 데스크톱 설치 시 아이콘 선택이 "가장 큰 `any` purpose 아이콘을 고른다"는 명시적이고 결정적인 규칙을 따른다.** jjanmate-app의 `app/manifest.ts` 구성(192px `any`, 512px `any`, 512px `maskable`)이라면 이 로직상 **512px `any` 아이콘이 항상 선택되어야 하고, `maskable` 아이콘은 애초에 후보에서 배제**된다.

### 2-2. 이 로직이 실제로 스테이블 채널에 배포되었는가

- 이 CL은 **"Predictable App Update"**라는 상위 프로젝트의 일부다. 관련 WICG 익스플레이너: <https://github.com/WICG/manifest-incubations/blob/gh-pages/predictable-app-updating.md>
- Chrome Platform Status(공식 기능 추적): <https://chromestatus.com/feature/5148463647686656> — "Web App Manifest: specify update eligibility, icon urls are Cache-Control: immutable" 기능으로, **"Shipping on desktop" 마일스톤이 Chrome 143**으로 기재.
- Intent to Ship 스레드(공식 blink-dev 메일링리스트, 1차 자료): <https://groups.google.com/a/chromium.org/g/blink-dev/c/3h-Rx2kVQow> — "Specify an update eligibility algorithm in the manifest spec. This makes the update process more deterministic and predictable..."라고 명시.
- 조사 시점(2026-08-08) 기준 Chrome 스테이블 버전은 **151(2026-07-28 릴리스), 152가 8/25 예정**임을 공식 Chrome Releases 블로그에서 확인(<https://chromereleases.googleblog.com/2026/08/stable-channel-update-for-desktop_01193673229.html>). M143은 M151보다 한참 이전(4주 주기 기준 약 8개 마일스톤, 대략 7~8개월 전)이므로, **이 결정적 선택 로직은 사용자가 테스트한 시점에 이미 스테이블 채널에 배포되어 있었을 가능성이 매우 높다.**

### 2-3. "이전에는 비결정적이었다"는 것이 명시적으로 확인되는가

- 이 CL의 제목이 "[**Predictable** App Update]"라는 점, 그리고 "primary icon"이라는 개념을 **여러 코드 경로(최초 설치, 매니페스트 업데이트 v2)가 공유하는 하나의 공개 함수로 새로 분리**했다는 커밋 설명은, 이 작업 이전에는 아이콘 선택 로직이 코드 경로마다 산재해 있었을 가능성을 강하게 시사한다.
- 그러나 **"과거(이 CL 이전) 버전에서 실제로 설치마다 다른 아이콘이 나왔다"고 명시적으로 서술한 1차 자료(크롬버그 리포트, 릴리스노트, 디자인 문서)는 이번 조사에서 찾지 못했다. → 확인 안 됨.** 이는 정황상 그럴듯한 추정이지, 확정된 사실은 아니다.
- Windows에 특화되어 "설치할 때마다/재설치 시 아이콘이 달라진다"를 그대로 서술하는 crbug(issues.chromium.org)도 찾지 못했다. **→ 확인 안 됨.**
- 대신 찾은 관련 Chromium 버그들은 전부 **macOS 특화** 이슈였다(Windows가 아님에 유의):
  - <https://issues.chromium.org/issues/40827667> — "MacPWAs PWA Icons are too big on macOS if 'maskable' icons not specified" (제목만 확인, 본문은 로그인 장벽으로 상세 확인 안 됨)
  - <https://issues.chromium.org/issues/40190430> — "Maskable PWA icon should respect macOS Big Sur ..." (제목만 확인, 본문 미확인)
  - 두 이슈 모두 Windows 데스크톱과는 무관.

### 2-4. Windows 셸/아이콘 캐시 문제일 가능성

이건 Chromium 버그가 아니라 **Windows OS 자체의 아이콘 캐시** 문제일 수도 있다는 가설도 검토했다:

- Windows는 `IconCache.db` 등 아이콘 캐시를 유지하며, 캐시 손상 시 재설치/변경 후에도 예전 아이콘이 그대로 보이는 현상이 널리 보고되어 있다(2차 자료, 일반적인 Windows 트러블슈팅 문서): <https://www.howtogeek.com/232779/how-to-rebuild-a-broken-icon-cache-in-windows-10/>, <https://www.winhelponline.com/blog/how-to-rebuild-the-icon-cache-in-windows/> 등.
- Microsoft Edge(Chromium 기반) 커뮤니티에서도 PWA의 Windows 셸 통합(시작 메뉴/작업 표시줄 아이콘)이 "설치마다 되기도 하고 안 되기도 하며 무작위처럼 보인다"는 사용자 보고가 있다: <https://techcommunity.microsoft.com/discussions/edgeinsiderdiscussions/all-non-store-system-integrated-pwa-icons-disappear-pwas-dont-all-immediately-in/4094786> — 단, 이 스레드는 **아이콘이 "사라지는"(완전히 안 보이는) 문제**이고 원인도 사용자가 추정한 "설치 위치(C드라이브 vs 다른 드라이브)" 문제로, **`any`/`maskable` 두 개 중 어느 것이 보이느냐는 이번 증상과는 결이 다르다.** 또한 Microsoft/Edge 팀의 공식 원인 확인 답변은 없음(2차/일화적 자료로만 표시).
- 별도로, 아이콘이 "품질 기준 미달"이면 Chrome이 의도적으로 빈 아이콘으로 대체하는 것으로 보이는 사용자 보고들도 있었으나(예: <https://medium.com/@androidgreek/how-to-restore-google-chrome-pwa-shortcut-icons-on-windows-f0cbdefed186>, 2차 자료, crbug 원문 링크 미확보), 이는 "빈 아이콘"이라는 별개 증상이라 이번 "any vs maskable 중 어느 게 뜨는가" 증상과는 직접 연관짓기 어렵다.

**요약: Windows 아이콘 캐시가 "왜 새 아이콘이 즉시 반영되지 않는가"의 보조 요인일 수는 있으나, "두 번 다 완전히 새로 설치했는데 매번 다른(둘 다 유효한) 아이콘이 나왔다"는 증상을 그것만으로 설명하는 1차 근거는 확인 안 됨.**

---

## 3. Android WebAPK / adaptive icon에서의 `purpose` 처리

### 3-1. Android 공식 문서(Adaptive icons)는 PWA와 무관

Android Developers의 adaptive icon 문서(<https://developer.android.com/develop/ui/views/launch/icon_design_adaptive>)를 직접 확인한 결과, **PWA/WebAPK/웹 매니페스트 `purpose`에 대한 언급이 전혀 없다.** 이 문서는 순수하게 네이티브 안드로이드 앱의 foreground/background/monochrome 레이어, 108×108dp 캔버스에 66×66dp safe zone 같은 **네이티브 앱 아이콘 규격**만 다룬다. 즉 adaptive icon 자체는 Android 플랫폼 개념이고, PWA와의 연결은 전적으로 **Chrome이 WebAPK를 생성할 때 manifest의 `purpose`를 이 네이티브 개념에 매핑해주는 쪽**에서 이루어진다.

### 3-2. Chrome for Developers 공식 문서(maskable icon)

<https://web.dev/articles/maskable-icon> (Google Chrome 팀이 직접 발행, 1차 자료에 준함)에서 확인한 내용:

- "To make an icon maskable, set its `purpose` value to `"maskable"` ... This removes the white background and gives you more control over the icon's appearance."
- "By default, icons have a purpose of `"any"`. In Android, these icons are resized on a white background."
- "Chrome supports Maskable icons and will ship support both for standard shortcuts and for the WebAPK minting service." — 즉 **Chrome은 WebAPK(Android) 경로에서도 `maskable` purpose를 인식하고 적용**한다고 명시적으로 밝힘.
- "We don't recommend using multiple purposes for maskable icons. Using `maskable` icons as `any` icons adds unnecessary padding..." — `"any maskable"`처럼 한 아이콘에 두 purpose를 같이 쓰는 것을 권장하지 않는다는 경고.

이 문서는 **"maskable 아이콘이 있으면 그것을 adaptive icon(WebAPK)에 쓰고, 없으면 any 아이콘을 흰 배경 위에 리사이즈해서 쓴다"**는 방향을 분명히 밝히고 있다. 즉 Android/WebAPK 경로는 **"maskable이 있으면 maskable을 쓴다"는 존재 여부 기반의 비교적 명확한 규칙**으로 보인다 — Windows 데스크톱의 "플랫폼별 플래그(`kPreferMaskableIcons`)"와는 다른 방식이지만, 마찬가지로 **문서화된 결정적 규칙**이라는 점은 같다.

### 3-3. Chromium WebAPK 생성 소스 코드 레벨 확인

WebAPK minting 서비스의 실제 아이콘 선택 소스 코드(예: `chrome/android/webapk/...` 쪽 구현)를 source.chromium.org/googlesource에서 직접 열어보려 했으나, 이번 조사에서는 접근이 막히거나(로그인 요구, 404) 정확한 파일을 특정하지 못했다. **→ 소스 코드 레벨의 "maskable 우선" 확정은 확인 안 됨.** 위 3-2의 web.dev 공식 문서(Google 자체 발행)를 근거로 판단했을 뿐, Chromium 저장소 코드 자체를 인용하지는 못했다는 점을 명시한다.

---

## 4. 크로스플랫폼 결론: 이 Windows 증상이 Android/TWA/Play Store 배포에도 영향이 있는가

근거를 종합하면:

1. **스펙(1번)**: 아이콘 선택은 애초에 UA(브라우저) 재량이라고 명시. 플랫폼마다 다른 규칙을 둬도 스펙 위반이 아니다.
2. **Windows 데스크톱(2번)**: 2025-07-11 커밋(`primary_icon_filter.cc`) 이후 Chromium은 Windows에서 **"any purpose 중 가장 큰 아이콘"을 결정적으로 선택**하고, `kPreferMaskableIcons`는 macOS/ChromeOS에서만 `true`다. 이 로직은 "Predictable App Update" 프로젝트의 일부로 Chrome 143에서 데스크톱에 배포됐고(<https://chromestatus.com/feature/5148463647686656>), 조사 시점(Chrome 151 스테이블)에는 이미 스테이블에 반영돼 있을 가능성이 매우 높다. **이 프로젝트는 blink-dev Intent to Ship 문서에 "N/A, feature isn't launching on Android"라고 명시되어 있다 — 즉 이 결정성 개선은 데스크톱 전용이고 Android에는 적용되지 않는다.**
3. **Android WebAPK(3번)**: web.dev 공식 문서 기준으로, Chrome은 Android WebAPK 경로에서 **maskable 아이콘이 있으면 그것을 쓰고, 없으면 any 아이콘을 흰 배경에 리사이즈**한다는 별도의(그리고 Windows 데스크톱용 규칙과는 무관한) 자체 규칙을 갖고 있다.

이로부터 다음과 같이 결론 지을 수 있다:

- **Windows 데스크톱에서 관찰된 "설치마다 다른 아이콘" 증상은, 근거가 확인되는 한도 내에서 Windows/데스크톱 Chromium에 특화된 문제(혹은 조사 시점 이전 버전의 잔재)이며, Android WebAPK/TWA 경로의 아이콘 선택 로직과는 코드/규칙이 별개다.**
- **Android 배포(Play Store, TWA/WebAPK)를 준비하는 관점에서는, 이 Windows 데스크톱 증상 자체를 Android 쪽 리스크로 그대로 옮겨올 근거는 없다.** 다만 이는 "Android에서는 절대 문제가 없다"는 것을 증명하는 것이 아니라, **"Windows 데스크톱에서 관찰된 이 특정 원인(플랫폼별 `kPreferMaskableIcons` 분기, Predictable App Update 이전의 잠재적 비일관성)이 Android에는 적용되지 않는 별개의 코드 경로라는 것"**을 뜻한다.
- Android 쪽에서 실제로 신경 써야 할 것은 오히려 **maskable 아이콘의 safe-zone 준수 여부**다 — web.dev 문서가 명확히 "maskable로 지정했는데 safe zone 밖 콘텐츠가 있으면 잘려 보인다"는 식으로 경고하고 있으므로, `app/manifest.ts`의 512px `maskable` 아이콘이 실제로 안전 영역(중앙 80% 원형 영역 기준, 흔히 쓰이는 40px 패딩/512px 기준 안내)을 지키고 있는지는 별도로 점검할 가치가 있다(단, 이 조사의 범위 밖이라 이번 문서에서는 실측하지 않았다. Windows에서 본 "이중 테두리 콘텐츠"로 보였다는 설명은 `any`가 잘림 없이 그대로 보이는 케이스, "더 작은/다른 콘텐츠"로 보였다는 설명은 `maskable`이 선택되어 safe-zone 마스킹이 적용된 케이스일 가능성이 있다는 정도로만 추정 가능하며, 이는 확정이 아니라 정황적 추정임을 명시한다).

---

## 결론

**이것이 "고쳐야 할 실제 버그"인가?**

- `app/manifest.ts` 자체의 설정(192px any, 512px any, 512px maskable)은 스펙과 Chrome 공식 문서가 권장하는 표준적인 3-아이콘 패턴이며, **레포 코드 잘못이 아니다.** 스펙은 애초에 "브라우저가 골라라"라고 위임하고 있고, Chromium은 Windows에서 그 재량을 "any 중 최대 크기"로 명시적으로 구현해뒀다(2025-07 커밋 기준).
- 그런데도 사용자가 실제로 두 번의 설치에서 다른 결과를 본 것은, (a) 그 커밋 반영 이전 시점의 잔존 동작, (b) Windows 셸/아이콘 캐시의 지연·불일치, (c) 이번 조사로 못 찾은 별도의 Chromium 회귀 중 하나일 가능성이 있으나 **어느 것이 실제 원인인지 1차 자료로 확정하지는 못했다(확인 안 됨).** 다만 최소한 "스펙 위반"이나 "이 레포 manifest.ts의 설정 실수"는 아니라는 점은 비교적 명확하다.
- **실무적 판단**: 이 문제를 지금 코드 레벨에서 "고칠" 방법은 마땅치 않다 — 스펙이 선택권을 브라우저에 넘겨놨고, 브라우저(Chromium)가 이미 결정적 규칙을 갖고 있다면 그 규칙을 레포 쪽에서 우회할 수단이 없다(예: `purpose: "any maskable"`처럼 합치는 것은 오히려 Chrome 자체가 비권장). 따라서 우선순위를 낮게 두고, Chrome 버전 업 이후에도 재현되는지 정도만 가볍게 재확인하는 것을 권장한다.

**Android 배포(Play Store)에 영향이 있는가?**

- **없다고 보는 것이 합리적이다.** 이 조사에서 확인된 원인 후보(Windows 데스크톱 전용 `kPreferMaskableIcons` 분기, Predictable App Update가 데스크톱 전용으로 명시됨, Windows 셸 아이콘 캐시)는 모두 **Windows/데스크톱 Chromium에 국한된 코드 경로/OS 동작**이며, Android WebAPK는 web.dev 공식 문서 기준 별도의(그리고 더 단순한, "maskable 있으면 그것을 쓴다") 규칙을 따른다.
- 따라서 **Android 배포 준비 시 이 Windows 증상을 별도로 대응할 필요는 없다.** 대신 Android/TWA 준비 단계에서는 (a) maskable 아이콘의 safe-zone 실측 검증, (b) 실제 기기/에뮬레이터에서 WebAPK 설치 후 아이콘 렌더링 확인 정도를 체크리스트에 넣는 것으로 충분하다.

---

## 참고 자료 (1차 자료 우선, 2차 자료는 [2차]로 표기)

1. <https://www.w3.org/TR/appmanifest/> — W3C Working Draft, Web App Manifest 본문 (`purpose` 정의, UA 재량 서술)
2. <https://w3c.github.io/manifest/> — 편집자 초안(living draft), 위와 동일 내용의 최신판
3. <https://www.w3.org/TR/manifest-app-info/> — 별도 모듈(Application Information), `icons`/`purpose` 정의는 여기 없음을 확인하는 용도로만 참조
4. <https://www.w3.org/standards/history/appmanifest/>, <https://www.w3.org/2022/04/webapps-wg-charter.html> — 스펙 관리 주체(W3C Web Applications Working Group) 이력
5. [2차] <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons> — MDN, `purpose` 서술 보조 확인
6. <https://chromium.googlesource.com/chromium/src/+/30d0dfe985553b6c16a7d02d7df0ee2346c23b0b> — Chromium 커밋 "[Predictable App Update] Implement primary icon algorithm for PWAs" (`primary_icon_filter.cc` 신설)
7. <https://issues.chromium.org/issues/427566601> — 위 커밋이 참조하는 버그 번호(본문 접근 제한으로 상세 미확인)
8. <https://github.com/WICG/manifest-incubations/blob/gh-pages/predictable-app-updating.md> — "Predictable App Update" WICG 익스플레이너
9. <https://chromestatus.com/feature/5148463647686656> — Chrome Platform Status, 기능/마일스톤(Chrome 143 데스크톱 배포) 공식 추적
10. <https://groups.google.com/a/chromium.org/g/blink-dev/c/3h-Rx2kVQow> — blink-dev Intent to Ship 스레드(데스크톱 전용, Android 미해당 명시)
11. <https://chromereleases.googleblog.com/2026/08/stable-channel-update-for-desktop_01193673229.html> — 2026-08 기준 Chrome 스테이블 버전(151) 공식 발표
12. <https://issues.chromium.org/issues/40827667>, <https://issues.chromium.org/issues/40190430> — macOS 특화 maskable 아이콘 관련 Chromium 이슈(제목만 확인, Windows 무관)
13. <https://github.com/chromium/chromium/blob/main/docs/windows_pwa_integration.md> — Chromium 공식 Windows PWA 통합 문서(아이콘 캐시 관련 서술 없음을 확인하는 용도)
14. [2차] <https://techcommunity.microsoft.com/discussions/edgeinsiderdiscussions/all-non-store-system-integrated-pwa-icons-disappear-pwas-dont-all-immediately-in/4094786> — Edge 커뮤니티, Windows PWA 셸 통합 불일치 일화 (원인은 이번 증상과 다름)
15. [2차] <https://www.howtogeek.com/232779/how-to-rebuild-a-broken-icon-cache-in-windows-10/>, <https://www.winhelponline.com/blog/how-to-rebuild-the-icon-cache-in-windows/> — Windows 아이콘 캐시 일반 트러블슈팅
16. [2차] <https://medium.com/@androidgreek/how-to-restore-google-chrome-pwa-shortcut-icons-on-windows-f0cbdefed186> — Chrome의 "품질 미달 아이콘 → 빈 아이콘" 대체 동작에 대한 사용자 보고(별개 증상)
17. <https://web.dev/articles/maskable-icon> — Chrome for Developers 공식 문서, maskable icon과 WebAPK/Android 처리 방식
18. <https://developer.android.com/develop/ui/views/launch/icon_design_adaptive> — Android Developers, adaptive icon 규격(PWA/WebAPK 언급 없음을 확인하는 용도)
