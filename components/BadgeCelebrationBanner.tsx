import { getNotifications, formatNotificationText } from '@/lib/notifications';
import BadgeCelebrationBannerClient from './BadgeCelebrationBannerClient';

// 디자인 시안의 "배지 획득 축하 모달"(화면 12) 대응. 풀스크린 모달 대신 마이페이지 상단
// 배너로 단순화(이 세션의 다른 문서화된 단순화들과 동일 원칙) — 미확인 월간배지 알림이
// 있을 때만 노출되고, 닫으면 해당 알림을 읽음 처리한다(lib/notify.ts가 setAuthorAction/
// createComment/monthly-badges 크론에서 이미 생성해둔 notifications 테이블을 그대로 재사용).
export default async function BadgeCelebrationBanner({ userId }: { userId: string }) {
  const notifications = await getNotifications(userId, 30);
  const unreadBadge = notifications.find((n) => n.type === 'monthly_badge' && !n.is_read);

  if (!unreadBadge) return null;

  return <BadgeCelebrationBannerClient notificationId={unreadBadge.id} text={formatNotificationText(unreadBadge)} />;
}
