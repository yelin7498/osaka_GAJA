'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveEditTokenLocally, addRecentTrip, getRecentTrips, RecentTrip } from '@/lib/auth/editToken';

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState('오사카·간사이 가족여행');
  const [slugName, setSlugName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState(4);
  const [hotel, setHotel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [loadSlug, setLoadSlug] = useState('');
  const [recent, setRecent] = useState<RecentTrip[]>([]);

  useEffect(() => {
    setRecent(getRecentTrips());
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slugName,
          trip: { title, startDate, endDate, travelers, hotel },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '생성에 실패했습니다.');

      saveEditTokenLocally(data.slug, data.editToken);
      addRecentTrip({ slug: data.slug, title: data.trip.title, visitedAt: new Date().toISOString() });
      router.push(`/trip/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setCreating(false);
    }
  }

  function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = loadSlug.trim();
    if (!trimmed) return;
    // 전체 URL을 붙여넣어도 slug만 추출
    const match = trimmed.match(/\/trip\/([a-zA-Z0-9-]+)/);
    const slug = match ? match[1] : trimmed;
    router.push(`/trip/${slug}`);
  }

  return (
    <div>
      <header className="shell">
        <div className="ticket">
          <div className="ticket-top">
            <div>
              <p className="eyebrow">Family Trip Planner</p>
              <h1 className="trip-title">가족여행 일정 플래너</h1>
            </div>
            <div className="stamp">편집 &amp;<br />공유</div>
          </div>
          <div className="ticket-meta">
            <div className="meta-item">
              새 일정 만들기<br />
              <span className="v">아래에서 바로 시작</span>
            </div>
            <div className="meta-item">
              이미 만든 일정<br />
              <span className="v">공유 링크 또는 코드로 열기</span>
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="card">
          <h2>새 여행 일정 만들기</h2>
          <p className="hint">기본 정보만 입력하면 바로 편집 화면으로 이동합니다. 날짜별 일정은 다음 화면에서 추가해요.</p>
          <form onSubmit={handleCreate}>
            <div className="item-edit-grid2" style={{ marginTop: 0 }}>
              <div>
                <label className="f">여행 제목</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="f">공유 주소 별명 (영문, 선택)</label>
                <input
                  value={slugName}
                  onChange={(e) => setSlugName(e.target.value)}
                  placeholder="예: osaka-family-trip"
                />
              </div>
            </div>
            <div className="item-edit-grid2">
              <div>
                <label className="f">출발일</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="f">귀국일</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="item-edit-grid2">
              <div>
                <label className="f">인원</label>
                <input
                  type="number"
                  min={1}
                  value={travelers}
                  onChange={(e) => setTravelers(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="f">숙소</label>
                <input value={hotel} onChange={(e) => setHotel(e.target.value)} placeholder="숙소명 입력" />
              </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 10 }}>{error}</p>}

            <button type="submit" className="primary add-row-btn" disabled={creating} aria-label="새 여행 일정 만들기">
              {creating ? '만드는 중...' : '여행 일정 만들기'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>기존 일정 불러오기</h2>
          <p className="hint">공유받은 링크 전체를 붙여넣거나, 마지막 부분(예: osaka-family-trip-a1b2)만 입력해도 됩니다.</p>
          <form onSubmit={handleLoad} style={{ display: 'flex', gap: 8 }}>
            <input
              value={loadSlug}
              onChange={(e) => setLoadSlug(e.target.value)}
              placeholder="https://.../trip/osaka-family-trip-a1b2"
            />
            <button type="submit" aria-label="기존 일정 불러오기">열기</button>
          </form>

          {recent.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label className="f">최근 방문한 일정</label>
              {recent.map((r) => (
                <div key={r.slug} className="item-view">
                  <div className="iv-main">
                    <div className="iv-activity">{r.title || r.slug}</div>
                    <div className="iv-place mono">/trip/{r.slug}</div>
                  </div>
                  <button className="ghost" onClick={() => router.push(`/trip/${r.slug}`)} aria-label={`${r.title} 열기`}>
                    열기
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
