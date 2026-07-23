import Link from 'next/link';

export default function TripNotFound() {
  return (
    <main className="content" style={{ marginTop: 60 }}>
      <div className="card state-screen">
        <p style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>일정을 찾을 수 없습니다.</p>
        <p className="hint">주소가 올바른지 확인하거나, 비공개로 전환된 일정일 수 있습니다.</p>
        <Link href="/">
          <button className="primary" aria-label="메인으로 이동">메인으로 돌아가기</button>
        </Link>
      </div>
    </main>
  );
}
