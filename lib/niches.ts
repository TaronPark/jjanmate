/**
 * 짠메이트 니치(niche) 코드 <-> 화면 표시명 매핑
 * (프로젝트 지식의 niches.ts와 동일한 파일 — 실제 코드에서 이 파일 하나만 수정하면
 * 화면에 보이는 니치 이름/룸 이름이 전부 바뀐다. DB 마이그레이션 불필요.)
 */

export type NicheCode = 'self_catering' | 'low_income_worker' | 'no_spend_challenge';

export const NICHES: Record<NicheCode, { label: string; description: string; roomName: string }> = {
  self_catering: {
    label: '자취생', // [가칭 — 확정되면 이 값만 수정]
    description: '대학생·취업준비생 (1인가구, 취업 전)',
    roomName: '자취생 식비 절약 룸',
  },
  low_income_worker: {
    label: '사회초년생', // 2026-07-24 확정 (기존 "저연봉근로자"에서 변경 — 소득수준 대신 생애주기로 표현)
    description: '사회에 갓 진출한 신입~저연차 직장인 (취업 후)',
    roomName: '사회초년생 룸',
  },
  no_spend_challenge: {
    label: '무지출챌린지', // [가칭 — 확정되면 이 값만 수정]
    description: '니치 무관 범용 온보딩 (7일/30일 챌린지)',
    roomName: '무지출챌린지 룸',
  },
};

export const NICHE_CODES = Object.keys(NICHES) as NicheCode[];

export const ctaByNiche: Record<NicheCode, string> = {
  self_catering: '가입하면 자취생 동료들과 같은 피드에서 만나요',
  low_income_worker: '가입하면 같은 처지의 동료들과 첫 저축을 함께해요',
  no_spend_challenge: '지금 방에 입장해 이 동료들과 함께 지출을 방어해보세요',
};
