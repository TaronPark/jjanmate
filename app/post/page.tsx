'use client';

import { Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { NICHES, type NicheCode } from '@/lib/niches';
import { createClient } from '@/lib/supabase/client';
import { createPost } from './actions';

// 4-A 4번 + 4-C Labor Illusion: 게시 -> "AI가 읽는 중..." 전환 화면 -> 피드.
// 2026-07-25: 실제 posts insert를 Server Action(actions.ts)으로 연동.
// status/ai_niche는 아직 3주차 AI 파이프라인이 없어 DB 기본값(pending/null) 그대로 저장됨 —
// 즉 지금은 게시해도 ai_niche가 비어있어 feed/[niche] 조회 조건(ai_niche=니치)에 안 걸림.
// 이건 버그가 아니라 3주차 착수 전까지는 정상적인 상태(기획서 6번 AI 태깅 파이프라인 참고).
// Labor Illusion 최소 노출시간: insert가 너무 빨리 끝나면 "AI가 읽는 중..." 화면이 순간
// 깜빡이고 사라져 4-C 설계 근거(Buell & Norton, 2011)가 의도한 체감 효과가 옅어지므로
// 실제 insert와 최소 1.2초 딜레이를 함께 기다림.
//
// 2026-07-25 (이미지 첨부): browser-image-compression으로 선택 즉시 리사이즈(긴 변 1600px)+
// 압축(품질 0.8)+EXIF 회전 자동보정까지 끝낸 뒤 미리보기를 보여준다. 원본이 10MB짜리 고화질
// 영수증 사진이어도 이 시점에 이미 훨씬 작아지므로, 예전에 고려했던 "5MB 초과 시 alert로 차단"
// 방식은 채택하지 않음(사용자를 막는 대신 압축해서 통과시키는 게 UX상 더 나음). 서버 쪽
// 방어선(버킷 file_size_limit=5MB)은 이 압축 로직을 우회하는 경우를 대비해 별도로 유지.
// 업로드는 게시 버튼을 누른 시점에 실제로 실행 — Storage 업로드 성공 후 posts insert가
// 실패하면 연결 안 된 파일이 남을 수 있으나(고아 파일), 지금 규모에선 감수 가능한 리스크로
// 합의됨(스트릭/리액션 때의 race condition 트레이드오프와 같은 급).
function PostContent() {
  const router = useRouter();
  const params = useSearchParams();
  const niche = (params.get('niche') as NicheCode) || 'monthly_rent_fighter';
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 첨부할 수 있어요.');
      e.target.value = '';
      return;
    }

    setCompressing(true);
    setError('');
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        initialQuality: 0.8,
        useWebWorker: true,
      });
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.error('이미지 처리 실패:', err);
      setError('이미지 처리 중 문제가 발생했어요. 다른 사진으로 시도해주세요.');
    } finally {
      setCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    setPosting(true);
    setError('');

    let imageUrl: string | null = null;

    if (imageFile) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('로그인이 필요합니다.');
        setPosting(false);
        return;
      }

      // 경로 관례: userId/UUID-timestamp.ext — Storage RLS의 INSERT 정책이 첫 폴더가
      // auth.uid()와 일치하는지 강제하므로 반드시 이 형태를 지켜야 업로드가 허용됨.
      const ext = imageFile.type.split('/')[1] || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('post_images').upload(path, imageFile);
      if (uploadError) {
        setError('이미지 업로드에 실패했어요: ' + uploadError.message);
        setPosting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('post_images').getPublicUrl(path);
      imageUrl = publicUrl;
    }

    const [result] = await Promise.all([
      createPost(content, imageUrl),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
    if (result.error) {
      setError(result.error);
      setPosting(false);
      return;
    }

    // 게시 후 상태 피드백(2026-07-25): 성공 + 재분류(niche_hint_mismatch)면 실제 분류된
    // 니치 룸으로 자동 이동 + 안내 배너. 그 외(성공+일치, low_confidence, system_error, pending)는
    // 전부 원래 있던 룸으로 보낸다 — 에러/저신뢰/대기 상태는 그 룸의 피드 쿼리가 "본인 글이면
    // ai_niche가 null이어도 포함"하도록 확장돼 있어 상태 카드로 계속 보인다(유령 게시물 방지).
    if (result.status === 'success' && result.ai_niche && result.niche_hint_mismatch) {
      router.push(`/feed/${result.ai_niche}?notice=reclassified`);
    } else {
      router.push(`/feed/${niche}`);
    }
  };

  if (posting) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p>AI가 읽는 중...</p>
      </main>
    );
  }

  return (
    <main>
      <h3>{NICHES[niche].composePrompt}</h3>
      <textarea
        value={content}
        maxLength={300}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`예: ${NICHES[niche].exampleSubtags[0]}로 오늘 지출 방어 성공`}
        style={{ width: '100%', minHeight: 80, padding: 8 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 8 }}>
        <span>{content.length}/300</span>
      </div>

      {imagePreview ? (
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <img
            src={imagePreview}
            alt="첨부 이미지 미리보기"
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 }}
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            style={{ position: 'absolute', top: 6, right: 6, fontSize: 11, padding: '4px 8px' }}
          >
            삭제
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, color: '#555' }}>
            사진 첨부
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'block', marginTop: 4, fontSize: 12 }}
              disabled={compressing}
            />
          </label>
          {compressing && <p style={{ fontSize: 11, color: '#888' }}>사진 처리 중...</p>}
        </div>
      )}

      {error && <p style={{ color: '#c0392b', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
      <button style={{ width: '100%', marginTop: 8 }} onClick={handlePost} disabled={!content || compressing}>
        게시하기
      </button>
    </main>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={null}>
      <PostContent />
    </Suspense>
  );
}
