'use client';

import { useState, useTransition } from 'react';
import { updateDefaultRoom, updateNotificationPrefs, type NotificationPrefs } from '@/app/settings/actions';
import type { Room } from '@/lib/types';

interface SettingsFormProps {
  rooms: Room[];
  initialDefaultRoomId: string | null;
  initialPrefs: NotificationPrefs;
}

const TOGGLE_LABELS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: 'notify_vote_feedback', label: '투표자 피드백 알림 (1-Click 완료 시)' },
  { key: 'notify_comment_reply', label: '댓글/답글 알림' },
  { key: 'notify_monthly_badge', label: '월간 배지 알림' },
];

// 기획서: 하단 탭 "룸" 진입 기본값 + 알림 3종 on/off. 저장은 항목별 즉시 반영(별도 "저장" 버튼 없음)
// — 토글/셀렉트 자체가 명확한 즉시성 액션이라 배치 저장 UX가 오히려 불필요한 단계로 판단.
export default function SettingsForm({ rooms, initialDefaultRoomId, initialPrefs }: SettingsFormProps) {
  const [defaultRoomId, setDefaultRoomId] = useState(initialDefaultRoomId ?? '');
  const [prefs, setPrefs] = useState(initialPrefs);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const handleRoomChange = (value: string) => {
    setDefaultRoomId(value);
    startTransition(async () => {
      await updateDefaultRoom(value || null);
      setSavedAt('room');
    });
  };

  const handleToggle = (key: keyof NotificationPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    startTransition(async () => {
      await updateNotificationPrefs(next);
      setSavedAt(key);
    });
  };

  return (
    <div>
      <section style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, margin: '0 0 8px', color: '#888' }}>룸탭 기본 룸 지정</h4>
        <select
          value={defaultRoomId}
          onChange={(e) => handleRoomChange(e.target.value)}
          style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', width: '100%' }}
        >
          <option value="">자동 (최근 방문한 룸 우선, 없으면 짠수다)</option>
          {rooms.map((r) => (
            <option key={r.code} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, margin: '0 0 8px', color: '#888' }}>알림 설정</h4>
        {TOGGLE_LABELS.map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0',
              fontSize: 13,
            }}
          >
            <span>{label}</span>
            <button
              onClick={() => handleToggle(key)}
              disabled={isPending}
              aria-pressed={prefs[key]}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: 'none',
                background: prefs[key] ? '#f5a623' : '#ddd',
                position: 'relative',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: prefs[key] ? 20 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.15s',
                }}
              />
            </button>
          </div>
        ))}
      </section>

      {savedAt && <p style={{ fontSize: 11, color: '#4caf50', margin: '0 0 16px' }}>변경사항이 저장됐어요.</p>}
    </div>
  );
}
