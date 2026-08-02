'use client';

import { useEffect } from 'react';

// 시안 화면 10 "글쓰기 검증 알림 Toast" 대응. 기존엔 인라인 빨간 텍스트로 검증 실패를
// 알렸는데, 시안 통일 작업으로 하단 고정 토스트로 교체. 2.5초 후 자동으로 사라진다.
export default function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return <div className="toast">{message}</div>;
}
