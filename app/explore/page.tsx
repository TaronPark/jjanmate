import Link from 'next/link';
import { NICHES, NICHE_CODES, type NicheCode } from '@/lib/niches';
import { createClient } from '@/lib/supabase/server';
import BottomTabBar from '@/components/BottomTabBar';
import FAB from '@/components/FAB';

// 2026-07-26 (UI/UX 개편 스펙 ①) — 하단 탭바의 [둘러보기]. 다른 니치 룸으로 "입장"하는
// 단순 허브 — 활동량(글 수) 등 통계는 의도적으로 표기하지 않음(사용자가 직접 요청한 스펙:
// "룸 상태 그대로를 열람할 수 있는" 것이 목적, docs/짠메이트_프론트엔드_UIUX_개편_스펙.md 참고).
// 로그인/비로그인 모두 접근 가능(니치 룸 자체가 비회원 열람을 허용하므로 이 허브도 동일하게 개방).
export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('onboarding_niche').eq('id', user.id).single()
    : { data: null };

  // FAB의 룸 컨텍스트 폴백값 — 이 화면은 룸이 아닌 허브이므로 항상 onboarding_niche를 사용.
  const fallbackNiche: NicheCode = profile?.onboarding_niche ?? 'monthly_rent_fighter';
  const homeNiche: NicheCode = profile?.onboarding_niche ?? 'lurker_lounge';

  return (
    <main style={{ paddingBottom: 72 }}>
      <h3>둘러보기</h3>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>
        다른 룸은 어떤 분위기인지 구경해보세요.
      </p>

      {NICHE_CODES.map((code) => (
        <Link key={code} href={`/feed/${code}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card">
            <strong style={{ fontSize: 14 }}>{NICHES[code].label}</strong>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{NICHES[code].description}</p>
          </div>
        </Link>
      ))}

      {user && <FAB niche={fallbackNiche} />}
      <BottomTabBar active="explore" isLoggedIn={!!user} homeNiche={homeNiche} />
    </main>
  );
}
