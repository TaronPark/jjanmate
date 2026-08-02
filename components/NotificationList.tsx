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
    return <p style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '40px 0' }}>아직 알림이 없어요.</p>;
  }

  return (
    <div>
      {hasUnread && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            onClick={handleMarkAll}
            style={{ fontSize: 11, color: '#888', border: 'none', background: 'none', padding: 4 }}
          >
            모두 읽음 처리
          </button>
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {notifications.map((n) => (
          <li key={n.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
            <button
              onClick={() => handleClick(n)}
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '12px 4px',
                border: 'none',
                background: 'none',
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
                    background: '#f5a623',
                  }}
                />
              )}
              <span style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, color: n.is_read ? '#888' : '#222', lineHeight: 1.4 }}>
                  {texts[n.id]}
                </p>
                <span style={{ fontSize: 11, color: '#bbb' }}>{new Date(n.created_at).toLocaleString('ko-KR')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
