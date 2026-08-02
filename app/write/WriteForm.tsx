'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { CloseIcon, CameraIcon } from '@/components/icons';
import ExitConfirmModal from '@/components/ExitConfirmModal';
import Toast from '@/components/Toast';
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

// 2026-08-02 시안 통일: 시안 화면 3(write-screen) 구조로 재작성. 룸/플레어 선택은 시안처럼
// 정적 배지가 아니라 실제 드롭다운(select, .dropdown 클래스로 시안 룩만 맞춤)이어야 해서
// 그대로 유지, 이탈방지는 window.confirm 대신 실제 3버튼 모달(ExitConfirmModal)로 교체.
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(!!draft);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreConfirm = (restore: boolean) => {
    if (!restore) {
      setTitle('');
      setBody('');
      setOneLineQuestion('');
      setImageUrls([]);
      deleteDraft();
    }
    setShowRestoreModal(false);
  };

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
    setFlairId('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrls.length >= MAX_IMAGES) {
      setToastMsg(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`);
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setToastMsg('이미지 파일만 첨부할 수 있어요.');
      e.target.value = '';
      return;
    }

    setUploading(true);
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
        setToastMsg('로그인이 필요합니다.');
        setUploading(false);
        return;
      }

      const ext = compressed.type.split('/')[1] || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('post_images').upload(path, compressed);
      if (uploadError) {
        setToastMsg('이미지 업로드에 실패했어요: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('post_images').getPublicUrl(path);
      setImageUrls((prev) => [...prev, publicUrl]);
    } catch (err) {
      console.error('이미지 처리 실패:', err);
      setToastMsg('이미지 처리 중 문제가 발생했어요.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCloseClick = () => {
    if (isInProgress) {
      setShowExitModal(true);
      return;
    }
    router.back();
  };

  const handleExitSaveDraft = async () => {
    await saveDraft({ roomId: roomId || null, flairId: flairId || null, title, body, oneLineQuestion, imageUrls });
    setShowExitModal(false);
    router.back();
  };

  const handleExitDiscard = async () => {
    await deleteDraft();
    setShowExitModal(false);
    router.back();
  };

  const handleManualSave = async () => {
    const result = await saveDraft({ roomId: roomId || null, flairId: flairId || null, title, body, oneLineQuestion, imageUrls });
    setToastMsg(result.error ?? '임시저장되었어요.');
  };

  const canSubmit = !!roomId && !!flairId && title.trim().length >= 2 && bodyLength >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!roomId || !flairId) setToastMsg('룸과 포스트 플레어를 선택해주세요.');
      else if (title.trim().length < 2) setToastMsg('제목을 2자 이상 입력해주세요.');
      else setToastMsg('본문을 10자 이상(공백 제외) 작성해주세요.');
      return;
    }

    setSubmitting(true);
    const result = await createPost({ roomId, flairId, title, body, oneLineQuestion, imageUrls });
    if (result.error) {
      setToastMsg(result.error);
      setSubmitting(false);
      return;
    }
    router.push(`/post/${result.postId}`);
  };

  return (
    <div className="write-screen">
      <div className="write-header">
        <button onClick={handleCloseClick} style={{ border: 'none', background: 'none', padding: 4 }} aria-label="닫기">
          <CloseIcon size={22} color="#111" />
        </button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>글쓰기</div>
        <button onClick={handleManualSave} className="write-btn">
          임시저장
        </button>
      </div>

      <div className="write-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <select className="dropdown" value={roomId} onChange={(e) => handleRoomChange(e.target.value)} style={{ flex: 1 }}>
            <option value="">🏠 룸 선택</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            className="dropdown"
            value={flairId}
            onChange={(e) => setFlairId(e.target.value)}
            disabled={!roomId}
            style={{ flex: 1 }}
          >
            <option value="">🏷️ 플레어 선택</option>
            {roomFlairs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        {!roomId && (
          <p style={{ fontSize: 11, color: 'var(--text-sub)', margin: '-12px 0 16px' }}>
            어느 방에 올릴지 고민된다면? 짠수다 룸에 자유롭게 올려보세요!
          </p>
        )}

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력해주세요 (최소 2자)" className="title-input" />

        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="내용을 자유롭게 적어주세요" className="content-input" />

        {selectedFlair?.show_ratio_bar && (
          <div className="question-input-box">
            <label>❓ 한줄질문 (선택)</label>
            <input
              value={oneLineQuestion}
              onChange={(e) => setOneLineQuestion(e.target.value)}
              placeholder="예: 이 가격에 당장 지르는 게 맞을까?"
              className="question-input"
            />
          </div>
        )}

        {imageUrls.length > 0 && (
          <div className="thumbnail-scroll">
            {imageUrls.map((url, idx) => (
              <div key={url} className="thumb-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`첨부 ${idx + 1}`} />
                {idx === 0 && <span className="thumb-rep">★ 대표</span>}
                <button onClick={() => removeImage(idx)} className="thumb-del" aria-label="이미지 삭제">
                  <CloseIcon size={12} color="#fff" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="keyboard-toolbar">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <CameraIcon size={20} color="#111" />
          이미지 ({imageUrls.length}/{MAX_IMAGES})
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={uploading || imageUrls.length >= MAX_IMAGES}
          />
        </label>
        {uploading && <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>사진 처리 중...</span>}
      </div>

      <button onClick={handleSubmit} disabled={submitting} className="submit-btn">
        {submitting ? '등록 중...' : '등록하기'}
      </button>

      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />

      {showRestoreModal && (
        <div className="overlay">
          <div className="dialog">
            <div className="dialog-title">작성 중이던 글이 있어요</div>
            <div className="dialog-desc">이어서 작성하시겠어요?</div>
            <div className="dialog-btns">
              <button className="btn btn-primary" onClick={() => handleRestoreConfirm(true)}>
                이어서 작성하기
              </button>
              <button className="btn btn-secondary" onClick={() => handleRestoreConfirm(false)}>
                새로 작성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitModal && (
        <ExitConfirmModal onSaveDraft={handleExitSaveDraft} onDiscard={handleExitDiscard} onCancel={() => setShowExitModal(false)} />
      )}
    </div>
  );
}
