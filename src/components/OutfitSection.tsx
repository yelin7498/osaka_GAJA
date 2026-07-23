'use client';

import { OutfitDay, emptyOutfit } from '@/lib/types';

interface Props {
  outfits: OutfitDay[];
  mode: 'view' | 'edit';
  onChange: (outfits: OutfitDay[]) => void;
}

const FIELDS: { key: keyof OutfitDay; label: string }[] = [
  { key: 'outer', label: '아우터' },
  { key: 'top', label: '상의' },
  { key: 'bottom', label: '하의' },
  { key: 'shoes', label: '신발' },
  { key: 'bag', label: '가방' },
  { key: 'hair', label: '헤어' },
];

export default function OutfitSection({ outfits, mode, onChange }: Props) {
  function update(id: string, patch: Partial<OutfitDay>) {
    onChange(outfits.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function remove(id: string) {
    onChange(outfits.filter((o) => o.id !== id));
  }
  function add() {
    onChange([...outfits, emptyOutfit(`Day ${outfits.length + 1}`)]);
  }

  return (
    <section className="card">
      <h2>코디 계획</h2>
      <p className="hint">날짜별로 입을 옷과 소품을 미리 정리해두면 짐 싸기가 훨씬 편해져요.</p>

      {outfits.length === 0 && mode === 'view' && <p className="hint" style={{ margin: 0 }}>등록된 코디가 없습니다.</p>}

      {outfits.map((o, i) => (
        <div key={o.id} className="card day-card" style={{ marginBottom: 12 }}>
          <div className="day-title">
            {mode === 'edit' ? (
              <input
                value={o.label}
                onChange={(e) => update(o.id, { label: e.target.value })}
                placeholder={`Day ${i + 1}`}
                style={{ maxWidth: 220 }}
                aria-label="날짜 라벨"
              />
            ) : (
              <h3>{o.label || `Day ${i + 1}`}</h3>
            )}
            {mode === 'edit' && (
              <button className="ghost danger" onClick={() => remove(o.id)} aria-label="코디 삭제">
                삭제
              </button>
            )}
          </div>

          {mode === 'edit' ? (
            <div className="item-edit-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {FIELDS.map((f) => (
                <input
                  key={f.key}
                  value={o[f.key] as string}
                  onChange={(e) => update(o.id, { [f.key]: e.target.value } as Partial<OutfitDay>)}
                  placeholder={f.label}
                  aria-label={f.label}
                />
              ))}
            </div>
          ) : (
            <p style={{ margin: '0 0 8px', fontSize: 13.5 }}>
              {FIELDS.filter((f) => o[f.key]).map((f) => `${f.label}: ${o[f.key]}`).join(' · ') || '아직 입력된 코디가 없습니다.'}
            </p>
          )}

          {mode === 'edit' ? (
            <textarea
              rows={2}
              value={o.memo}
              onChange={(e) => update(o.id, { memo: e.target.value })}
              placeholder="메모 (예: 우천 대비, 활동성 위주 등)"
              aria-label="코디 메모"
            />
          ) : (
            o.memo && <p className="iv-memo" style={{ margin: 0 }}>{o.memo}</p>
          )}
        </div>
      ))}

      {mode === 'edit' && (
        <button className="add-row-btn" onClick={add} aria-label="코디 날짜 추가">
          + 코디 날짜 추가
        </button>
      )}
    </section>
  );
}
