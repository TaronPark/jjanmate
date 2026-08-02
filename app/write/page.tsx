import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRooms, getAllFlairs } from '@/lib/rooms';
import { getMyDraft } from './actions';
import WriteForm from './WriteForm';

// 글쓰기 (기획서 5-2 맥락 기반 동선 + 11장 글쓰기 UX 상세).
// 풀스크린 단일 폼으로 구현(원본의 3/2/1-Step 마법사 대신 룸/플레어 프리셋을 쿼리파라미터로
// 미리 채워주는 방식) — MVP 1차 축약, 추후 진짜 단계형 UI로 보강 가능.
export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; flair?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const sp = await searchParams;
  const [rooms, flairs, draft] = await Promise.all([getRooms(), getAllFlairs(), getMyDraft()]);

  const presetRoom = sp.room ? rooms.find((r) => r.code === sp.room) : undefined;
  const presetFlair = sp.flair ? flairs.find((f) => f.code === sp.flair) : undefined;

  return (
    <WriteForm
      rooms={rooms}
      flairs={flairs}
      initialRoomId={draft?.room_id ?? presetRoom?.id ?? null}
      initialFlairId={draft?.flair_id ?? presetFlair?.id ?? null}
      draft={draft}
    />
  );
}
