import { createAdminClient } from '@/lib/supabase/admin';
import type { Notification } from '@/lib/types';

// 알림 생성 헬퍼 (기획서 알림함 스펙 대응 — notifications 테이블은 존재했으나 발송 로직
// 미구현 상태였음, 2026-08-02 구현). notifications는 client insert 정책이 없으므로
// (본인 것이라도 알림은 "상대방 행동의 결과"라 자가 생성을 허용하면 스팸 벡터가 됨) 항상
// admin(service_role) 클라이언트로만 insert한다.
//
// notifications의 RLS 자체는 본인(auth.uid()=user_id) insert를 허용하지만(schema.sql §12),
// 알림은 항상 "상대방의 행동 결과"로만 생성되어야 하고 받는 사람이 자기 자신일 수 없으므로
// (댓글 작성자가 자기 글에 알림을 만들 이유가 없음) 이 헬퍼는 알림 대상자가 아닌 트리거 액션의
// 주체(글쓴이/투표자/배치job)가 항상 service_role로 호출하는 서버 전용 함수로 통일한다.
//
// 발송 전 수신자의 profiles.notify_* 설정을 확인해 꺼져 있으면 행 자체를 만들지 않는다
// (notifications 테이블에 "읽음/안읽음"만 있고 "알림 종류별 on/off"는 프로필에 있으므로,
// 꺼진 알림까지 쌓아두고 필터링하는 것보다 애초에 안 만드는 쪽이 테이블도 가볍고 로직도 단순함).
type NotifyType = Notification['type'];

const PREF_COLUMN: Record<NotifyType, 'notify_vote_feedback' | 'notify_comment_reply' | 'notify_monthly_badge'> = {
  vote_feedback: 'notify_vote_feedback',
  comment_reply: 'notify_comment_reply',
  monthly_badge: 'notify_monthly_badge',
};

export async function notifyIfEnabled(
  userId: string,
  type: NotifyType,
  payload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  const prefColumn = PREF_COLUMN[type];

  const { data: profile } = await admin.from('profiles').select(prefColumn).eq('id', userId).maybeSingle();
  // 프로필 자체가 없거나(탈퇴 등) 해당 알림 종류를 꺼둔 경우 생성하지 않음.
  if (!profile || profile[prefColumn as keyof typeof profile] === false) return;

  const { error } = await admin.from('notifications').insert({ user_id: userId, type, payload });
  if (error) {
    console.error(`알림 생성 실패 (type=${type}, user=${userId}):`, error.message);
  }
}

// 여러 명에게 같은 종류의 알림을 보낼 때(예: 1-Click 완료 시 투표자 전원) 각자의 설정을
// 개별 확인해야 하므로 단순 반복 호출한다 — 대상 인원이 게시글 하나의 투표자 수(수십~수백)
// 규모라 배치 insert 최적화는 현재 규모에서 불필요.
export async function notifyManyIfEnabled(
  userIds: string[],
  type: NotifyType,
  payload: Record<string, unknown>
): Promise<void> {
  await Promise.all(userIds.map((uid) => notifyIfEnabled(uid, type, payload)));
}
