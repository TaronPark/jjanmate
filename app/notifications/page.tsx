import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getNotifications, formatNotificationText, notificationLink } from '@/lib/notifications';
import NotificationList from '@/components/NotificationList';

// 인앱 알림함 (기획서: 투표자 피드백/댓글답글/월간배지 알림). 하단 4탭에는 자리가 없어
// 인기 피드 헤더의 종 아이콘에서 진입하는 별도 화면으로 둔다.
export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const notifications = await getNotifications(user.id);
  const texts: Record<string, string> = {};
  const links: Record<string, string | null> = {};
  for (const n of notifications) {
    texts[n.id] = formatNotificationText(n);
    links[n.id] = notificationLink(n);
  }
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <main style={{ paddingBottom: 40 }}>
      <h3 style={{ fontSize: 15, margin: '0 0 12px' }}>알림</h3>
      <NotificationList notifications={notifications} texts={texts} links={links} hasUnread={hasUnread} />
    </main>
  );
}
