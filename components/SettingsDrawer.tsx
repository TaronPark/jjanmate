'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMySettingsData, type SettingsData } from '@/app/settings/actions';
import { createClient } from '@/lib/supabase/client';
import SettingsForm from './SettingsForm';
import { CloseIcon, BellIcon, DocumentIcon, LogoutIcon, ChevronRightIcon } from './icons';

// 시안 화면 9 "앱 설정 드로어" 대응. 헤더 "더보기" 아이콘에서 열리며, 열릴 때만 지연
// 로딩(lazy load)으로 룸/알림설정 데이터를 가져온다(모든 페이지 헤더에서 매번 프로필을
// 미리 fetch하지 않기 위함). 룸 기본값/알림 3종은 시안의 drawer-item 두 줄(chevron 클릭 시
// 하위 화면 이동) 대신, 바로 조작 가능한 인라인 컨트롤(SettingsForm)로 병합했다 — 화면 전환
// 없이 즉시 토글되는 편이 실제 사용성이 더 낫다고 판단.
export default function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<SettingsData | null | undefined>(undefined);

  useEffect(() => {
    getMySettingsData().then(setData);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>설정</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', padding: 4 }} aria-label="닫기">
            <CloseIcon size={20} color="#111" />
          </button>
        </div>

        {data === undefined && <p style={{ fontSize: 12, color: '#888' }}>불러오는 중...</p>}

        {data === null && (
          <div>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>로그인하면 알림·룸 설정을 이용할 수 있어요.</p>
            <Link href="/login" className="drawer-item" onClick={onClose}>
              로그인 <ChevronRightIcon size={16} color="#8e8e93" />
            </Link>
            <Link href="/terms" className="drawer-item" onClick={onClose}>
              서비스 이용약관 <ChevronRightIcon size={16} color="#8e8e93" />
            </Link>
            <Link href="/privacy" className="drawer-item" onClick={onClose}>
              개인정보처리방침 <ChevronRightIcon size={16} color="#8e8e93" />
            </Link>
          </div>
        )}

        {data && (
          <div>
            <SettingsForm rooms={data.rooms} initialDefaultRoomId={data.defaultRoomId} initialPrefs={data.prefs} />

            <Link href="/notifications" className="drawer-item" onClick={onClose}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BellIcon size={16} color="#111" /> 알림함
                {data.unreadNotificationCount > 0 && (
                  <span style={{ fontSize: 11, color: '#e74c3c', fontWeight: 700 }}>{data.unreadNotificationCount}</span>
                )}
              </span>
              <ChevronRightIcon size={16} color="#8e8e93" />
            </Link>
            <Link href="/terms" className="drawer-item" onClick={onClose}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DocumentIcon size={16} color="#111" /> 서비스 이용약관
              </span>
              <ChevronRightIcon size={16} color="#8e8e93" />
            </Link>
            <Link href="/privacy" className="drawer-item" onClick={onClose}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DocumentIcon size={16} color="#111" /> 개인정보처리방침
              </span>
              <ChevronRightIcon size={16} color="#8e8e93" />
            </Link>
            <button onClick={handleLogout} className="drawer-item" style={{ color: '#c0392b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogoutIcon size={16} color="#c0392b" /> 로그아웃
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
