'use client';

// 시안 화면 11 "작성 이탈 방지 모달" 대응. 기존엔 window.confirm 2버튼(확인/취소)으로 축약했던
// 것을 시안대로 3버튼(임시저장 / 작성취소(삭제) / 계속 작성하기)으로 재구현.
export default function ExitConfirmModal({
  onSaveDraft,
  onDiscard,
  onCancel,
}: {
  onSaveDraft: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">작성 중인 글이 있습니다</div>
        <div className="dialog-desc">저장하지 않고 나가시겠습니까?</div>
        <div className="dialog-btns">
          <button className="btn btn-primary" onClick={onSaveDraft}>
            임시저장
          </button>
          <button className="btn btn-secondary" onClick={onDiscard}>
            작성취소 (삭제)
          </button>
          <button className="btn btn-plain" onClick={onCancel}>
            계속 작성하기
          </button>
        </div>
      </div>
    </div>
  );
}
