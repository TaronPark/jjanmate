import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRooms } from '@/lib/rooms';
import SettingsForm from '@/components/SettingsForm';
import LogoutButton from '@/components/LogoutButton';
import { CloseIcon } from '@/components/icons';

// 설정 화면 (디자인 시안 "앱 설정 드로어" 대응). 슬라이드 드로어 대신 전체화면 페이지로
// 구현 — 이 세션에서 반복된 "문서화된 단순화" 원칙(글쓰기 이탈모달=window.confirm,
// 상세화면 이미지=단일 표시 등)과 동일선상. 기능(기본룸/알림/약관/로그아웃)은 시안과 1:1 대응.
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, rooms] = await Promise.all([
    supabase
      .from('profiles')
      .select('default_room_id, notify_vote_feedback, notify_comment_reply, notify_monthly_badge')
      .eq('id', user.id)
      .single(),
    getRooms(),
  ]);

  return (
    <main style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <strong style={{ fontSize: 16 }}>설정</strong>
        <Link href="/mypage" style={{ display: 'flex' }}>
          <CloseIcon size={20} color="#333" />
        </Link>
      </div>

      <SettingsForm
        rooms={rooms}
        initialDefaultRoomId={profile?.default_room_id ?? null}
        initialPrefs={{
          notify_vote_feedback: profile?.notify_vote_feedback ?? true,
          notify_comment_reply: profile?.notify_comment_reply ?? true,
          notify_monthly_badge: profile?.notify_monthly_badge ?? true,
        }}
      />

      <section style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, margin: '0 0 8px', color: '#888' }}>서비스 정책</h4>
        <Link
          href="/terms"
          style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#111', textDecoration: 'none' }}
        >
          서비스 이용약관
        </Link>
        <Link
          href="/privacy"
          style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#111', textDecoration: 'none' }}
        >
          개인정보처리방침
        </Link>
      </section>

      <LogoutButton />
    </main>
  );
}
