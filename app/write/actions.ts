'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getTodayKst } from '@/lib/date';

export interface DraftInput {
  roomId: string | null;
  flairId: string | null;
  title: string;
  body: string;
  oneLineQuestion: string;
  imageUrls: string[];
}

export interface CreatePostInput {
  roomId: string;
  flairId: string;
  title: string;
  body: string;
  oneLineQuestion: string;
  imageUrls: string[];
}

// 기획서 4-2: 당일 24:00(KST) 자동 만료. "오늘(KST) 24시" == "내일(KST) 00시"의 UTC 인스턴트를
// 계산한다. lib/date.ts의 getTodayKst()가 이미 KST 오프셋을 다루고 있어 동일 원칙을 재사용.
function getTodayMidnightKstIso(): string {
  const todayKst = getTodayKst();
  const [y, m, d] = todayKst.split('-').map(Number);
  const expiresAtMs = Date.UTC(y, m - 1, d + 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
  return new Date(expiresAtMs).toISOString();
}

function isValidPostImageUrl(url: string): boolean {
  const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post_images/`;
  return url.startsWith(expectedPrefix);
}

export async function getMyDraft() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return data;
}

// 기획서 4-1: 본문 공백제외 10자 이상일 때만 "작성 중인 상태"로 간주해 임시저장 대상이 됨.
// 30초 주기 자동저장 + 수동 [임시저장] 버튼 양쪽에서 이 액션을 호출한다(유저당 1개, upsert).
export async function saveDraft(input: DraftInput): Promise<{ error: string | null }> {
  const bodyWithoutSpace = input.body.replace(/\s/g, '');
  if (bodyWithoutSpace.length < 10) {
    return { error: null }; // 저장 조건 미충족 — 조용히 무시(에러 아님)
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase.from('drafts').upsert(
    {
      user_id: user.id,
      room_id: input.roomId,
      flair_id: input.flairId,
      title: input.title || null,
      body: input.body || null,
      one_line_question: input.oneLineQuestion || null,
      image_urls: input.imageUrls.length > 0 ? input.imageUrls : null,
      updated_at: new Date().toISOString(),
      expires_at: getTodayMidnightKstIso(),
    },
    { onConflict: 'user_id' }
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteDraft(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase.from('drafts').delete().eq('user_id', user.id);
  if (error) return { error: error.message };
  return { error: null };
}

export interface CreatePostResult {
  error: string | null;
  postId: string | null;
}

// 기획서 1.2 필수 입력 검증: 룸+플레어, 제목 2자 이상, 본문(공백제외) 10자 이상.
export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  const title = input.title.trim();
  const body = input.body.trim();
  const bodyWithoutSpace = body.replace(/\s/g, '');

  if (!input.roomId || !input.flairId) {
    return { error: '룸과 포스트 플레어를 선택해주세요.', postId: null };
  }
  if (title.length < 2) {
    return { error: '제목을 2자 이상 입력해주세요.', postId: null };
  }
  if (bodyWithoutSpace.length < 10) {
    return { error: '본문을 10자 이상(공백 제외) 작성해주세요.', postId: null };
  }

  const validImageUrls = input.imageUrls.filter(isValidPostImageUrl);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.', postId: null };

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      room_id: input.roomId,
      flair_id: input.flairId,
      title,
      body,
      one_line_question: input.oneLineQuestion.trim() || null,
      image_urls: validImageUrls.length > 0 ? validImageUrls : null,
    })
    .select('id')
    .single();

  if (error || !post) {
    return { error: error?.message ?? '게시글 저장에 실패했습니다.', postId: null };
  }

  // 게시 성공 시 임시저장글은 더 이상 필요 없으므로 정리(실패해도 게시 자체는 이미 성공).
  await supabase.from('drafts').delete().eq('user_id', user.id);

  revalidatePath('/', 'page');
  revalidatePath('/room/[code]', 'page');

  return { error: null, postId: post.id };
}
