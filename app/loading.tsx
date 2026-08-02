// 인기 피드(루트 '/') 및 자체 loading.tsx가 없는 하위 라우트의 기본 로딩 스켈레톤.
export default function RootLoading() {
  return (
    <main style={{ paddingBottom: 72 }}>
      <div className="app-header">
        <span className="logo-text">Jjanmate</span>
      </div>

      <div className="filter-bar">
        <div className="skeleton-block" style={{ width: 90, height: 32 }} />
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
