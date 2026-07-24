/**
 * 짠메이트 니치(niche) 코드 <-> 화면 표시명 매핑
 *
 * 왜 이 파일이 존재하나:
 * DB(profiles.onboarding_niche, posts.ai_niche, matching_previews.niche)에는
 * 아래 NicheCode 값("monthly_rent_fighter" 등)만 저장한다. 실제 유저에게 보여줄
 * 한글 이름은 여기 한 곳에서만 관리한다.
 *
 * 2026-07-24 전면 개편: 생애주기(자취생/사회초년생) 기준에서 소비 페인포인트 기준
 * (월세독립군/홧김비용방어/눈팅러) 으로 니치를 재정의함. 이번엔 단순 라벨 변경이 아니라
 * 니치의 의미 자체가 바뀌었기 때문에 내부 코드도 함께 교체함(self_catering 등 폐기).
 * 실 데이터가 0건인 시점이라 마이그레이션 비용 없이 처리함 — schema.sql의 CHECK 제약조건도
 * 함께 갱신 필요(Supabase 실제 프로젝트에는 ALTER로 반영 예정, 1~2주차 DB 작업 시 처리).
 *
 * profiles.onboarding_niche(유저가 고른 홈룸)와 posts.ai_niche(그 글이 실제로 어울리는 니치)는
 * 서로 독립적으로 설계되어 있어, 한 유저가 여러 페인포인트에 걸쳐 있어도(예: 월세독립군 유저가
 * 홧김비용 얘기를 써도) 그 글은 자동으로 맞는 피드에 노출된다 — 니치 간 개념적 중첩을
 * 스키마 변경 없이 흡수하는 구조.
 */

export type NicheCode = 'monthly_rent_fighter' | 'impulse_expense_defender' | 'lurker_lounge';

export const NICHES: Record<
  NicheCode,
  { label: string; description: string; roomName: string; exampleSubtags: string[] }
> = {
  monthly_rent_fighter: {
    label: '월세 독립군',
    description: '월세·관리비·공과금 등 고정비 압박 속 생존형 절약을 실천하는 1인 가구',
    roomName: '숨만 쉬어도 나가는 돈, 월세 독립군 룸',
    exampleSubtags: ['보일러외출모드', '배달앱삭제', '냉장고파먹기', '다이소득템'],
  },
  impulse_expense_defender: {
    label: 'SNS 지름신 & 홧김비용 방어',
    description: 'SNS발 포모(FOMO) 충동구매와 스트레스성 과소비를 참아내는 청년층',
    roomName: 'SNS 지름신 & 홧김비용 방어 룸',
    exampleSubtags: ['포모디톡스', '인스타템방어', '시발비용방어', '택시비참음', '잔바리지출'],
  },
  lurker_lounge: {
    label: '프로눈팅러의 대리만족',
    description: '아직 내 소비 패턴을 모르거나 미션 참여가 부담스러운 눈팅족을 위한 범용 대기실',
    roomName: '프로눈팅러의 대리만족 룸',
    exampleSubtags: ['절약관찰기', '대리만족', '무지출구경'],
  },
};

export const NICHE_CODES = Object.keys(NICHES) as NicheCode[];

export const ctaByNiche: Record<NicheCode, string> = {
  monthly_rent_fighter: '가입하면 같은 고정비 압박을 버티는 동료들과 같은 피드에서 만나요',
  impulse_expense_defender: '가입하면 홧김비용을 함께 참아내는 동료들과 만나요',
  lurker_lounge: '지금 방에 입장해 눈팅부터 편하게 시작해보세요',
};
