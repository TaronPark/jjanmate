'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { markNotificationRead } from '@/app/notifications/actions';
import { CrownIcon, CloseIcon } from './icons';

export default function BadgeCelebrationBannerClient({ notificationId, text }: { notificationId: string; text: string }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = async () => {
    setDismissed(true);
    await markNotificationRead(notificationId);
    router.refresh();
  };

  if (dismissed) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#fffcf5',
        border: '1px solid #e6a822',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <CrownIcon size={32} color="#e6a822" />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>축하합니다! 🎉</p>
        <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.4 }}>{text}</p>
      </div>
      <button onClick={handleDismiss} style={{ border: 'none', background: 'none', padding: 4, flexShrink: 0 }}>
        <CloseIcon size={16} color="#888" />
      </button>
    </div>
  );
}
