'use client';

import { PRIORITY_LEVELS, Spot, emptySpot } from '@/lib/types';

interface Props {
  spots: Spot[];
  mode: 'view' | 'edit';
  onChange: (spots: Spot[]) => void;
}

export default function SpotsSection({ spots, mode, onChange }: Props) {
  function update(id: string, patch: Partial<Spot>) {
    onChange(spots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function remove(id: string) {
    onChange(spots.filter((s) => s.id !== id));
  }
  function add() {
    onChange([...spots, emptySpot()]);
  }

  const grouped = new Map<string, Spot[]>();
  spots.forEach((s) => {
    const key = s.region || '미지정';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  });

  return (
    <section className="card">
      <h2>주요 여행지</h2>
      <p className="hint">가고 싶은 곳을 지역별로 모아두고 우선순위와 방문 여부를 체크하세요.</p>

      {spots.length === 0 && mode === 'view' && <p className="hint" style={{ margin: 0 }}>등록된 여행지가 없습니다.</p>}

      {mode === 'edit'
        ? spots.map((s) => (
            <div
              key={s.id}
              className="section-row"
              style={{ gridTemplateColumns: '0.9fr 1.4fr 1.1fr 0.7fr 1.3fr auto auto' }}
            >
              <input value={s.region} onChange={(e) => update(s.id, { region: e.target.value })} placeholder="지역" aria-label="지역" />
              <input value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} placeholder="장소명" aria-label="장소명" />
              <input value={s.category} onChange={(e) => update(s.id, { category: e.target.value })} placeholder="분류" aria-label="분류" />
              <select value={s.priority} onChange={(e) => update(s.id, { priority: e.target.value })} aria-label="우선순위">
                {PRIORITY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input value={s.memo} onChange={(e) => update(s.id, { memo: e.target.value })} placeholder="메모" aria-label="메모" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <input type="checkbox" checked={s.visited} onChange={(e) => update(s.id, { visited: e.target.checked })} aria-label="방문 여부" />
                방문
              </label>
              <button className="ghost danger row-delete" onClick={() => remove(s.id)} aria-label="여행지 삭제">
                삭제
              </button>
            </div>
          ))
        : Array.from(grouped.entries()).map(([region, list]) => (
            <div key={region}>
              <div className="group-title">{region}</div>
              {list.map((s) => (
                <div key={s.id} className="item-view">
                  <div className="iv-time">
                    <span className={`priority-tag ${s.priority}`}>{s.priority}</span>
                  </div>
                  <div className="iv-main">
                    <div className={`iv-activity ${s.visited ? 'done' : ''}`} style={s.visited ? { textDecoration: 'line-through', color: 'var(--ink-soft)' } : undefined}>
                      {s.name}
                      {s.visited && ' ✓'}
                    </div>
                    <div className="iv-place">{s.category}</div>
                    {s.memo && <div className="iv-memo">{s.memo}</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}

      {mode === 'edit' && (
        <button className="add-row-btn" onClick={add} aria-label="여행지 추가">
          + 여행지 추가
        </button>
      )}
    </section>
  );
}
