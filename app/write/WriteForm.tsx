'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { CloseIcon, CameraIcon } from '@/components/icons';
import type { Room, PostFlair, Draft } from '@/lib/types';
import { saveDraft, deleteDraft, createPost } from './actions';

interface WriteFormProps {
  rooms: Room[];
  flairs: PostFlair[];
  initialRoomId: string | null;
  initialFlairId: string | null;
  draft: Draft | null;
}

const MAX_IMAGES = 5;

export default function WriteForm({ rooms, flairs, initialRoomId, initialFlairId, draft }: WriteFormProps) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(initialRoomId ?? '');
  const [flairId, setFlairId] = useState(initialFlairId ?? '');
  const [title, setTitle] = useState(draft?.title ?? '');
  const [body, setBody] = useState(draft?.body ?? '');
  const [oneLineQuestion, setOneLineQuestion] = useState(draft?.one_line_question ?? '');
  const [imageUrls, setImageUrls] = useState<string[]>(draft?.image_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 임시저장글이 있으면 진입 즉시 이어서 작성할지 확인(기획서 4-3).
  const [askedRestore, setAskedRestore] = useState(false);
  useEffect(() => {
    if (draft && !askedRestore) {
      setAskedRestore(true);
      const confirmed = window.confirm('작성 중이던 글이 있습니다. 이어서 작성하시겠습니까?');
      if (!confirmed) {
        setTitle('');
        setBody('');
        setOneLineQuestion('');
        setImageUrls([]);
        deleteDraft();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bodyLength = body.replace(/\s/g, '').length;
  const isInProgress = bodyLength >= 10;

  // 기획서 4-2: 30초 주기 자동저장.
  useEffect(() => {
    if (!isInProgress) return;
    const timer = setInterval(() => {
      saveDraft({ roomId: roomId || null, flairId: flairId || null, title, body, oneLineQuestion, imageUrls });
    }, 30000);
    return () => clearInterval(timer);
  }, [isInProgress, roomId, flairId, title, body, oneLineQuestion, imageUrls]);

  const roomFlairs = flairs.filter((f) => f.room_id === roomId);
  const selectedFlair = flairs.find((f) => f.id === flairId);

  const handleRoomChange = (newRoomId: string) => {
    setRoomId(newRoomId);
    // 룸을 바꾸면 이전 룸의 플레어 선택은 무효 — 초기화.
    setFlairId('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrls.length >= MAX_IMAGES) {
      alert(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`);
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 첨부할 수 있어요.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError('');
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1920,
        initialQuality: 0.8,
        useWebWorker: true,
      });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('로그인이 필요합니다.');
        setUploading(false);
        return;
      }

      const ext = compressed.type.split('/')[1] || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('post_images').upload(path, compressed);
      if (uploadError) {
        setError('이미지 업로드에 실패했어요: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('post_images').getPublicUrl(path);
      setImageUrls((prev) => [...prev, publicUrl]);
    } catch (err) {
      console.error('이미지 처리 실패:', err);
      setError('이미지 처리 중 문제가 발생했어요.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClose = () => {
    if (isInProgress) {
      const confirmed = window.confirm('작성 중인 내용이 있어요. 임시저장하고 나갈까요? (취소하면 계속 작성)');
      if (!confirmed) return;
      saveDraft({ roomId: roomId || null, flairId: flairId || null, title, body, oneLineQuestion, imageUrls });
    }
    router.back();
  };

  const handleManualSave = async () => {
    const result = await saveDraft({ roomId: roomId || null, flairId: flairId || null, title, body, oneLineQuestion, imageUrls });
    if (result.error) {
      setError(result.error);
    } else {
      alert('임시저장되었어요.');
    }
  };

  const canSubmit = !!roomId && !!flairId && title.trim().length >= 2 && bodyLength >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!roomId || !flairId) setError('룸과 포스트 플레어를 선택해주세요.');
      else if (title.trim().length < 2) setError('제목을 2자 이상 입력해주세요.');
      else setError('본문을 10자 이상(공백 제외) 작성해주세요.');
      return;
    }

    setSubmitting(true);
    setError('');
    const result = await createPost({ roomId, flairId, title, body, oneLineQuestion, imageUrls });
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push(`/post/${result.postId}`);
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={handleClose} style={{ border: 'none', background: 'none', padding: 4 }} aria-label="닫기">
          <CloseIcon size={20} />
        </button>
        <button onClick={handleManualSave} style={{ fontSize: 12, border: 'none', background: 'none', color: '#888' }}>
          임시저장
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select
          value={roomId}
          onChange={(e) => handleRoomChange(e.target.value)}
          style={{ flex: 1, fontSize: 13, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
        >
          <option value="">룸 선택</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          value={flairId}
          onChange={(e) => setFlairId(e.target.value)}
          disabled={!roomId}
          style={{ flex: 1, fontSize: 13, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
        >
          <option value="">플레어 선택</option>
          {roomFlairs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      {!roomId && (
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 12px' }}>
          어느 방에 올릴지 고민된다면? 짠수다 룸에 자유롭게 올려보세요!
        </p>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력해주세요"
        style={{ width: '100%', padding: 10, marginBottom: 8, fontSize: 14, border: '1px solid #ddd', borderRadius: 8 }}
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="내용을 자유롭게 적어주세요"
        style={{ width: '100%', minHeight: 140, padding: 10, fontSize: 14, border: '1px solid #ddd', borderRadius: 8 }}
      />

      {selectedFlair?.show_ratio_bar && (
        <input
          value={oneLineQuestion}
          onChange={(e) => setOneLineQuestion(e.target.value)}
          placeholder="한줄질문 (선택) — 예: 이 가격에 당장 지르는 게 맞을까?"
          style={{ width: '100%', padding: 10, marginTop: 8, fontSize: 13, border: '1px solid #ddd', borderRadius: 8 }}
        />
      )}

      <div style={{ margin: '12px 0' }}>
        {imageUrls.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8 }}>
            {imageUrls.map((url, idx) => (
              <div key={url} style={{ position: 'relative', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`첨부 ${idx + 1}`} style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                {idx === 0 && (
                  <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 9, background: '#f5a623', color: '#fff', padding: '1px 4px', borderRadius: 4 }}>
                    대표
                  </span>
                )}
                <button
                  onClick={() => removeImage(idx)}
                  style={{ position: 'absolute', top: 2, right: 2, fontSize: 10, padding: '2px 5px', border: 'none', borderRadius: 10, background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555' }}>
          <CameraIcon size={16} />
          사진 첨부 ({imageUrls.length}/{MAX_IMAGES})
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={uploading || imageUrls.length >= MAX_IMAGES}
          />
        </label>
        {uploading && <p style={{ fontSize: 11, color: '#888' }}>사진 처리 중...</p>}
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 12, margin: '0 0 8px' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          marginTop: 'auto',
          width: '100%',
          padding: 12,
          borderRadius: 12,
          border: 'none',
          background: canSubmit ? '#f5a623' : '#eee',
          color: canSubmit ? '#fff' : '#999',
          fontWeight: 700,
        }}
      >
        {submitting ? '등록 중...' : '등록하기'}
      </button>
    </main>
  );
}
