import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Notification } from '@/lib/types';

// notifications는 RLS로 본인 것만 select 가능(schema.sql §12) — 세션 클라이언트로 충분하며
// admin 클라이언트가 필요 없다(생성만 admin, 조회는 본인 세션).
export const getNotifications = cache(async (userId: string, limit = 30): Promise<Notification[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('알림 목록 조회 실패:', error.message);
    return [];
  }
  return data ?? [];
});

export const getUnreadNotificationCount = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) {
    console.error('안읽은 알림 수 조회 실패:', error.message);
    return 0;
  }
  return count ?? 0;
});

// 알림 문구는 payload(jsonb)의 종류별 필드 조합으로 이 함수에서 조립한다 — 서버 저장 시점에는
// 최소한의 구조화 데이터만 담고, 실제 사람이 읽는 문장은 화면 렌더링 시점에 만든다
// (문구 톤을 나중에 바꿔도 과거 알림 데이터를 백필할 필요가 없도록).
export function formatNotificationText(n: Notification): string {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
    case 'vote_feedback': {
      const title = typeof p.post_title === 'string' ? p.post_title : '게시글';
      const action = typeof p.action_label === 'string' && p.action_label ? p.action_label : '상태 변경';
      return `투표했던 "${title}" 글이 "${action}"(으)로 마무리됐어요.`;
    }
    case 'comment_reply': {
      const title = typeof p.post_title === 'string' ? p.post_title : '게시글';
      return p.kind === 'comment_reply'
        ? `내 댓글에 답글이 달렸어요. ("${title}")`
        : `내 글 "${title}"에 댓글이 달렸어요.`;
    }
    case 'monthly_badge': {
      const ym = typeof p.year_month === 'string' ? p.year_month : '';
      const rank = typeof p.rank === 'number' ? p.rank : '';
      const category = p.category === 'comment' ? '댓글' : '게시글';
      const scopeLabel = p.scope === 'global' ? '전체' : typeof p.room_name === 'string' ? p.room_name : '룸';
      return `${ym} ${scopeLabel} ${category} TOP${rank}에 선정됐어요! 🏆`;
    }
    default:
      return '새 알림이 도착했어요.';
  }
}

export function notificationLink(n: Notification): string | null {
  const p = n.payload as Record<string, unknown>;
  if ((n.type === 'vote_feedback' || n.type === 'comment_reply') && typeof p.post_id === 'string') {
    return `/post/${p.post_id}`;
  }
  return null;
}
