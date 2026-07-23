export default function Loading() {
  return (
    <main className="content" style={{ marginTop: 60 }}>
      <div className="card state-screen">
        <div className="spin" aria-hidden />
        <p>여행 일정을 불러오는 중...</p>
      </div>
    </main>
  );
}
