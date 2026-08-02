import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRooms } from '@/lib/rooms';
import SettingsForm from '@/components/SettingsForm';
import LogoutButton from '@/components/LogoutButton';
import { ChevronDownIcon } from '@/components/icons';

// 설정 화면(디자인 시안 화면 9 "앱 설정 드로어" 대응)의 전체화면 버전. 2026-08-02 시안 통일
// 작업으로 실제 슬라이드 드로어(헤더 더보기 아이콘 → components/SettingsDrawer.tsx)가
// 주 진입 경로가 됐고, 이 페이지는 직접 URL로 들어오는 경우를 위한 대체 경로로 남겨둔다
// (SettingsForm을 그대로 재사용해 두 UI가 항상 같은 로직을 공유).
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
      <div className="write-header">
        <Link href="/mypage" style={{ display: 'flex' }} aria-label="뒤로가기">
          <ChevronDownIcon size={22} color="#111" style={{ transform: 'rotate(90deg)' }} />
        </Link>
        <div style={{ fontWeight: 700, fontSize: 15 }}>설정</div>
        <span style={{ width: 22 }} />
      </div>

      <div className="page-body">
        <SettingsForm
          rooms={rooms}
          initialDefaultRoomId={profile?.default_room_id ?? null}
          initialPrefs={{
            notify_vote_feedback: profile?.notify_vote_feedback ?? true,
            notify_comment_reply: profile?.notify_comment_reply ?? true,
            notify_monthly_badge: profile?.notify_monthly_badge ?? true,
          }}
        />

        <section style={{ marginTop: 16 }}>
          <Link href="/terms" className="drawer-item">
            서비스 이용약관
          </Link>
          <Link href="/privacy" className="drawer-item">
            개인정보처리방침
          </Link>
        </section>

        <div style={{ marginTop: 16 }}>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
