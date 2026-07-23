'use client';

import { PackingItem, emptyPackingItem } from '@/lib/types';

interface Props {
  packing: PackingItem[];
  mode: 'view' | 'edit';
  onChange: (packing: PackingItem[]) => void;
}

export default function PackingSection({ packing, mode, onChange }: Props) {
  function update(id: string, patch: Partial<PackingItem>) {
    onChange(packing.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function remove(id: string) {
    onChange(packing.filter((p) => p.id !== id));
  }
  function add(category = '기타') {
    onChange([...packing, { ...emptyPackingItem(), category }]);
  }

  const grouped = new Map<string, PackingItem[]>();
  packing.forEach((p) => {
    const key = p.category || '기타';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  });
  const doneCount = packing.filter((p) => p.done).length;

  return (
    <section className="card">
      <h2>준비물</h2>
      <p className="hint">캐리어에 챙길 물건을 카테고리별로 정리하고, 챙길 때마다 체크하세요.</p>

      {packing.length > 0 && (
        <div className="summary-bar">
          <span>
            챙김 <b>{doneCount}</b> / {packing.length}
          </span>
        </div>
      )}

      {packing.length === 0 && mode === 'view' && <p className="hint" style={{ margin: 0 }}>등록된 준비물이 없습니다.</p>}

      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <div className="group-title">{category}</div>
          {items.map((p) => (
            <div key={p.id} className={`pack-row ${p.done ? 'done' : ''}`}>
              <input type="checkbox" checked={p.done} onChange={(e) => update(p.id, { done: e.target.checked })} aria-label="챙김 여부" />
              {mode === 'edit' ? (
                <>
                  <input
                    className="cl-input"
                    style={{ flex: 1 }}
                    value={p.text}
                    onChange={(e) => update(p.id, { text: e.target.value })}
                    placeholder="물품명"
                    aria-label="물품명"
                  />
                  <input
                    style={{ width: 110 }}
                    value={p.category}
                    onChange={(e) => update(p.id, { category: e.target.value })}
                    placeholder="카테고리"
                    aria-label="카테고리"
                  />
                  <button className="ghost danger row-delete" onClick={() => remove(p.id)} aria-label="항목 삭제">
                    삭제
                  </button>
                </>
              ) : (
                <span className="cl-text" style={{ flex: 1, fontSize: 13.5 }}>
                  {p.text || '(내용 없음)'}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      {mode === 'edit' && (
        <button className="add-row-btn" onClick={() => add()} aria-label="준비물 추가">
          + 준비물 추가
        </button>
      )}
    </section>
  );
}
