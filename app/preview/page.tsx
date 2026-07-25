import { NICHES, ctaByNiche, type NicheCode } from '@/lib/niches';
import { createClient } from '@/lib/supabase/server';
import LoginButton from '@/components/LoginButton';

// 4-A 3번: 매칭 프리뷰. 2026-07-21 검토 반영 — 블러 없이 본문 실제 노출, 닉네임만 마스킹.
//
// 2026-07-25 (5주차, 시드 콘텐츠 + 매칭 프리뷰 배치): 더미 카드를 matching_previews 테이블
// 실데이터로 교체. 이전엔 useSearchParams + Suspense 우회로 클라이언트 컴포넌트였는데,
// 서버에서 데이터를 읽어와야 하는 이상 그럴 필요가 전혀 없어 async Server Component로 전면
// 전환했다 — searchParams를 prop으로 직접 받으면 useSearchParams/Suspense 보일러플레이트가
// 통째로 사라진다. 클릭 시 라우팅이 필요한 로그인 버튼만 components/LoginButton.tsx로 분리.
//
// 마스킹은 유저별이 아니라 니치 단위 고정 라벨(NICHES[niche].maskLabel)이라, DB(matching_previews)
// 에는 유저 식별 정보를 전혀 저장하지 않고 content/image_url만 담아둔다(크론 쪽 설계 참고).
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string }>;
}) {
  const { niche: nicheParam } = await searchParams;
  const requestedNiche = nicheParam as NicheCode;
  const niche: NicheCode = NICHES[requestedNiche] ? requestedNiche : 'monthly_rent_fighter';

  const supabase = await createClient();
  // matching_previews는 SELECT가 공개 정책(matching_previews_select_all)이라 비로그인 세션으로도
  // 문제없이 조회됨. 아직 크론이 한 번도 안 돈 니치는 행 자체가 없을 수 있어 maybeSingle 사용
  // (single()은 0건일 때 에러로 취급됨).
  const { data: preview } = await supabase
    .from('matching_previews')
    .select('preview_snapshot')
    .eq('niche', niche)
    .maybeSingle();

  const snapshot = (preview?.preview_snapshot ?? []) as { content: string; image_url: string | null }[];
  const cards = snapshot.slice(0, 2);

  return (
    <main>
      <h3>이런 분들과 매칭돼요</h3>
      {cards.length > 0 ? (
        cards.map((card, i) => (
          <div className="card" key={i}>
            <p style={{ fontSize: 11, color: '#0c447c', margin: '0 0 4px' }}>[{NICHES[niche].maskLabel} 동료]</p>
            {card.image_url && (
              // 피드 카드와 동일한 스타일(object-fit/max-height/border-radius)로 통일
              <img
                src={card.image_url}
                alt="매칭 프리뷰 이미지"
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
              />
            )}
            <p style={{ fontSize: 13, margin: 0 }}>{card.content}</p>
          </div>
        ))
      ) : (
        // 아직 이 니치에 matching_previews 데이터가 없을 때(시딩/첫 크론 실행 전)의 대체 문구 —
        // 화면이 비어 보이지 않도록 최소한의 방어 문구만 표시.
        <div className="card">
          <p style={{ fontSize: 13, margin: 0, color: '#888' }}>
            곧 이 방에 어울리는 동료들의 이야기가 채워질 거예요!
          </p>
        </div>
      )}
      <p style={{ fontSize: 13, color: '#555' }}>{ctaByNiche[niche]}</p>
      <LoginButton
        niche={niche}
        label={niche === 'lurker_lounge' ? '지금 아지트 입장해서 구경하기' : '가입하고 계속하기'}
      />
    </main>
  );
}
