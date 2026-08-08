// 짠메이트 PWA 서비스워커 — 수동(Vanilla) 구현.
// next-pwa/Serwist는 Next.js 16의 기본 번들러인 Turbopack을 지원하지 않아 배제함
// (둘 다 webpack 플러그인 기반). 이 파일은 정적 파일로 그대로 서빙되므로 번들러와 무관하게 동작.
//
// 캐싱 범위를 최소로 유지하는 이유: middleware.ts가 매 요청마다 Supabase 세션 쿠키를
// 갱신하는데(auth.getUser()), 서비스워커가 HTML 내비게이션이나 /api·/auth 응답을
// cache-first로 가로채면 그 서버 요청 자체가 스킵되어 "로그인했는데 세션이 조용히
// 갱신 안 됨" 버그가 재발할 수 있음. 그래서 정적 자산만 캐싱하고, 나머지는 전부
// 네트워크로 그대로 흘려보낸다(network-first/network-only).

const CACHE_NAME = 'jjanmate-static-v1';
const STATIC_CACHE_PATTERNS = [/^\/_next\/static\//, /^\/icons\//, /^\/icon(\?.*)?$/, /^\/apple-icon(\?.*)?$/];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // cross-origin(Supabase API/Storage 등)은 절대 가로채지 않음.
  if (url.origin !== self.location.origin) return;

  // GET이 아닌 요청(mutation 등)은 그대로 통과.
  if (request.method !== 'GET') return;

  // HTML 내비게이션, /api, /auth 는 항상 네트워크로 — 세션 쿠키 갱신·리다이렉트가
  // 매번 실제로 실행되어야 함(특히 /auth/callback은 캐시되면 안 됨).
  if (request.mode === 'navigate' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // 해시된 정적 자산만 cache-first.
  const isStaticAsset = STATIC_CACHE_PATTERNS.some((re) => re.test(url.pathname));
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
