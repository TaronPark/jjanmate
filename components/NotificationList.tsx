'use client';

import { useRouter } from 'next/navigation';
import { markNotificationRead, markAllNotificationsRead } from '@/app/notifications/actions';
import type { Notification } from '@/lib/types';

interface NotificationListProps {
  notifications: Notification[];
  texts: Record<string, string>;
  links: Record<string, string | null>;
  hasUnread: boolean;
}

// 알림 클릭 시 읽음 처리 + 연결된 게시글로 이동(post_id가 있는 vote_feedback/comment_reply만
// 이동, monthly_badge는 별도 상세 화면이 없어 클릭 시 읽음 처리만 한다).
export default function NotificationList({ notifications, texts, links, hasUnread }: NotificationListProps) {
  const router = useRouter();

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
    }
    const link = links[n.id];
    if (link) {
      router.push(link);
    } else {
      router.refresh();
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    router.refresh();
  };

  if (notifications.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--text-sub)', textAlign: 'center', padding: '40px 16px' }}>아직 알림이 없어요.</p>;
  }

  return (
    <div>
      {hasUnread && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px 0' }}>
          <button onClick={handleMarkAll} style={{ fontSize: 11, color: 'var(--text-sub)', border: 'none', background: 'none', padding: 4 }}>
            모두 읽음 처리
          </button>
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {notifications.map((n) => (
          <li key={n.id} className="list-item">
            <button
              onClick={() => handleClick(n)}
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {!n.is_read && (
                <span
                  style={{
                    marginTop: 5,
                    flexShrink: 0,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--gold)',
                  }}
                />
              )}
              <span style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, color: n.is_read ? 'var(--text-sub)' : 'var(--text-main)', lineHeight: 1.4 }}>
                  {texts[n.id]}
                </p>
                <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{new Date(n.created_at).toLocaleString('ko-KR')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
