// all_icons_260801.html(부록 아이콘 매핑 가이드, PDF 38p)에서 추출한 미니멀 SVG 아이콘 세트.
// 전부 stroke 기반(currentColor)이라 color prop으로 색을 제어한다. size 기본값 20px.
import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

const base = (size: number, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

// 하단 네비게이션 (인기/룸/글쓰기/마이페이지)
export function NavFlameIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
    </svg>
  );
}

export function NavHomeIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function NavWriteIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function NavUserIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// 피드 & 반응
export function VoteUpIcon({ size = 20, color, strokeWidth = 1.8, active, style }: IconProps & { active?: boolean }) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} fill={active ? 'currentColor' : 'none'} style={style}>
      <path d="M12 3l7 8h-4v10H9V11H5l7-8z" />
    </svg>
  );
}

export function VoteDownIcon({ size = 20, color, strokeWidth = 1.8, active, style }: IconProps & { active?: boolean }) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} fill={active ? 'currentColor' : 'none'} style={style}>
      <path d="M12 21l-7-8h4V3h6v10h4l-7 8z" />
    </svg>
  );
}

export function BookmarkIcon({ size = 20, color, strokeWidth = 1.8, active, style }: IconProps & { active?: boolean }) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} fill={active ? 'currentColor' : 'none'} style={style}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function CommentIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function MoreVerticalIcon({ size = 20, color, style }: IconProps) {
  return (
    <svg {...base(size, 1.8)} stroke={color ?? 'currentColor'} fill="currentColor" style={style}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

// 글쓰기
export function PostSubmitIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 13l4 3 5-6" />
    </svg>
  );
}

export function CameraIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function CloseIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function QuestionMarkIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// 마이페이지 & 시스템
export function SettingsIcon({ size = 20, color, strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function EditPencilIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function TrophyIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  );
}

export function BellIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function DocumentIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export function LogoutIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// 수정요청사항(2026-08-03, p.2) "최신순 앞 아이콘이 촌스럽다" — all_icons_260801.html에는
// 시계 아이콘이 정의돼 있지 않아 기존 stroke 아이콘들과 동일한 스타일(원+시침/분침)로 새로 제작.
// 룸피드 정렬 드롭다운의 최신순 옵션 전용.
export function ClockIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

// 컴포넌트 보완
export function ChevronDownIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function PinnedIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 0 0-6 0v3.76z" />
    </svg>
  );
}

// all_icons_260801.html "2. 댓글 업보트 전면 뱃지" 섹션의 badge-sprout — 댓글 업보트 Level 1(3~4표,
// 공감) 전면 뱃지용. 2026-08-02까지는 정의만 있고 코드에 연결이 안 돼 있었음(CommentItem.tsx 참고).
export function SproutIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M7 20h10" />
      <path d="M12 20v-8" />
      <path d="M12 12c-3-2.5-5-2.5-7-1 0 5 3.5 7 7 7" />
      <path d="M12 12c3-2.5 5-2.5 7-1 0 5-3.5 7-7 7" />
    </svg>
  );
}

// all_icons_260801.html의 badge-crown — 댓글 업보트 Level 3(10표 이상, 베스트댓글) 전면 뱃지용.
// 기존엔 PinnedIcon(압정)으로 대체 사용 중이었으나 기획서 명세와 다른 아이콘이라 이걸로 교체함.
// 이름을 CommentCrownIcon으로 둔 이유: 월간 랭킹용 solid-fill CrownIcon(아래, 다른 파일 스타일)과
// 이름이 겹치고 스타일도 다름(이쪽은 다른 뱃지 아이콘들과 통일된 stroke 기반).
export function CommentCrownIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5z" />
    </svg>
  );
}

export function TrashIcon({ size = 20, color, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} stroke={color ?? 'currentColor'} style={style}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function CrownIcon({ size = 16, color = '#eab308', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M3 18h18l-1.5-9-4 3-2.5-5-2.5 5-4-3L3 18z" />
    </svg>
  );
}

export function StarIcon({ size = 16, color = '#eab308', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
