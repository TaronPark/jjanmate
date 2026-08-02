'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { markNotificationRead } from '@/app/notifications/actions';
import { CrownIcon } from './icons';

// 시안 화면 12 "배지 획득 축하 모달" 대응. 2026-08-02 시안 통일 작업으로 기존 인라인 배너를
// 실제 overlay+dialog 모달로 교체 — 마이페이지 진입 시 미확인 monthly_badge 알림이 있으면
// 뜨고, 확인을 누르면 해당 알림을 읽음 처리한다.
export default function BadgeCelebrationBannerClient({ notificationId, text }: { notificationId: string; text: string }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const handleConfirm = async () => {
    setDismissed(true);
    await markNotificationRead(notificationId);
    router.refresh();
  };

  if (dismissed) return null;

  return (
    <div className="overlay">
      <div className="dialog">
        <CrownIcon size={48} color="#111" style={{ marginBottom: 12 }} />
        <div className="dialog-title">축하합니다! 🎉</div>
        <div className="dialog-desc">{text}</div>
        <button className="btn btn-primary" onClick={handleConfirm}>
          확인
        </button>
      </div>
    </div>
  );
}
