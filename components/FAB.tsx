import Link from 'next/link';
import type { NicheCode } from '@/lib/niches';

interface FABProps {
  // 2026-07-26 (UI/UX 개편 스펙 ②) — 지금 보고 있는 화면이 특정 니치 룸(app/feed/[niche])이면
  // 그 룸을 그대로 유지, 룸이 아닌 화면(둘러보기 인덱스/마이페이지)이면 호출하는 쪽이
  // profiles.onboarding_niche를 넘겨준다("어느 탭에서 왔는지"가 아니라 "지금 보고 있는 화면이
  // 룸인지 아닌지"가 기준 — 둘러보기를 거쳐 들어간 룸도 홈 탭에서 들어간 룸과 동일하게 취급).
  niche: NicheCode;
}

// 로그인 유저에게만 노출 — 호출하는 쪽(app/feed/[niche], app/explore, app/mypage)이
// isLoggedIn 조건으로 렌더링 여부를 결정한다(기존 상단 "글쓰기" 버튼도 {user && ...} 조건이었음).
export default function FAB({ niche }: FABProps) {
  return (
    <Link
      href={`/post?niche=${niche}`}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 64, // 하단 탭 바(약 48~56px) 바로 위
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: '#f5a623',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        textDecoration: 'none',
        zIndex: 11,
      }}
      aria-label="글쓰기"
    >
      ✍️
    </Link>
  );
}
