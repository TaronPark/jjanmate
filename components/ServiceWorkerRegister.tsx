'use client';

import { useEffect } from 'react';

// 프로덕션에서만 등록 — 개발 중에는 Turbopack HMR과 서비스워커 캐시가 충돌해
// "코드 고쳤는데 반영 안 됨"처럼 보이는 혼란을 피하기 위함.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('서비스워커 등록 실패:', error);
    });
  }, []);

  return null;
}
