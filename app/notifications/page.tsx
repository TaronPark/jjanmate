import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getNotifications, formatNotificationText, notificationLink } from '@/lib/notifications';
import NotificationList from '@/components/NotificationList';
import { ChevronDownIcon } from '@/components/icons';

// 인앱 알림함 (기획서: 투표자 피드백/댓글답글/월간배지 알림). 시안 12개 화면엔 별도
// 알림함 화면이 없어(알림 기능 자체가 시안 제작 이후 추가됨), 헤더 더보기 드로어의
// "알림함" 항목에서 진입하는 서브 화면으로 배치하고 write-header와 동일한 룩으로 통일했다.
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
      <div className="write-header">
        <Link href="/mypage" style={{ display: 'flex' }} aria-label="뒤로가기">
          <ChevronDownIcon size={22} color="#111" style={{ transform: 'rotate(90deg)' }} />
        </Link>
        <div style={{ fontWeight: 700, fontSize: 15 }}>알림</div>
        <span style={{ width: 22 }} />
      </div>
      <NotificationList notifications={notifications} texts={texts} links={links} hasUnread={hasUnread} />
    </main>
  );
}
