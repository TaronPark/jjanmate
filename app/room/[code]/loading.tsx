// 룸 드롭박스로 룸을 바꾸거나 룸 피드에 직접 진입할 때, 서버에서 데이터를 모으는 동안
// 즉시 보여주는 스켈레톤. RSC 네비게이션 중 화면이 멈춘 것처럼 보이는 체감 지연을 줄인다.
export default function RoomFeedLoading() {
  return (
    <main style={{ paddingBottom: 72 }}>
      <div className="app-header">
        <span className="logo-text">Jjanmate</span>
      </div>

      <div className="filter-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton-block" style={{ width: 90, height: 32 }} />
          <div className="skeleton-block" style={{ flex: 1, height: 32 }} />
        </div>
        <div className="skeleton-block" style={{ width: 120, height: 12, marginTop: 8 }} />
      </div>

      {[0, 1, 2].map((i) => (
        <div className="post-card" key={i}>
          <div className="skeleton-block" style={{ width: '60%', height: 14, marginBottom: 10 }} />
          <div className="skeleton-block" style={{ width: '90%', height: 16, marginBottom: 8 }} />
          <div className="skeleton-block" style={{ width: '100%', height: 40 }} />
        </div>
      ))}
    </main>
  );
}
