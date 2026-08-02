import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 시드 콘텐츠 드립 크론 (기획서 §8-3항 "시드 콘텐츠 고지·면책" 대응, 이용약관 제8조 3항).
// seed_contents_pool(가상 계정 명의로 미리 작성해둔 게시글 풀)에서 아직 게시되지 않은
// 글을 하루 한 번, 최대 DAILY_CAP개만 골라 posts 테이블에 실제로 insert한다.
//
// 2026-08-02: 기획 개편이 진행 중인 동안 기존 시드 계정 30개 + 콘텐츠 24개 + 이미 게시된
// 시드 게시글을 DB에서 전량 삭제했고, vercel.json에서도 이 크론 등록을 제거했다(재배포해도
// 더는 자동 실행되지 않음). 최종 기획이 확정되면 새 시드 계정/콘텐츠를 다시 채운 뒤
// vercel.json에 크론을 다시 등록할 것 — 이 라우트 코드 자체는 그대로 재사용 가능하도록 남겨둠.
//
// 2026-08-02 피벗 이전 v1 드립 크론은 "런칭 이후 경과일 기준 테이퍼링 + 니치별 잔여 풀 비례
// 배분 + 시간대별 발행 비중"까지 갖춘 정교한 로직이었지만(lib/date.ts의 getKstDaysSinceLaunch/
// getKstHour 주석 참고), 신규 룸/플레어 체계의 시드 풀은 24개뿐이라 그 정교함이 필요 없다.
// 그냥 pool 순서대로(id 오름차순) 매일 최대 DAILY_CAP개씩 순차 게시하는 것으로 단순화했다
// — 문서화된 의도적 단순화(이 세션의 다른 단순화들과 동일한 원칙).
const DAILY_CAP = 4;

export async function GET() {
  const admin = createAdminClient();

  const { data: pending, error: fetchError } = await admin
    .from('seed_contents_pool')
    .select('id, room_id, flair_id, seed_user_id, title, body, one_line_question')
    .is('posted_at', null)
    .order('id', { ascending: true })
    .limit(DAILY_CAP);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ posted: 0, reason: '풀 소진 — 게시할 시드 콘텐츠가 더 없음' });
  }

  const now = new Date().toISOString();
  let posted = 0;

  for (const item of pending) {
    const { error: insertError } = await admin.from('posts').insert({
      user_id: item.seed_user_id,
      room_id: item.room_id,
      flair_id: item.flair_id,
      title: item.title,
      body: item.body,
      one_line_question: item.one_line_question,
    });
    if (insertError) {
      console.error(`시드 게시 실패 (pool id=${item.id}):`, insertError.message);
      continue;
    }
    await admin.from('seed_contents_pool').update({ posted_at: now }).eq('id', item.id);
    posted += 1;
  }

  return NextResponse.json({ posted, attempted: pending.length });
}
