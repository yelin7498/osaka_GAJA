'use client';

import { ChecklistItem, emptyChecklistItem } from '@/lib/types';

interface Props {
  checklist: ChecklistItem[];
  mode: 'view' | 'edit';
  onChange: (checklist: ChecklistItem[]) => void;
}

export default function ChecklistSection({ checklist, mode, onChange }: Props) {
  function update(id: string, patch: Partial<ChecklistItem>) {
    onChange(checklist.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function remove(id: string) {
    onChange(checklist.filter((c) => c.id !== id));
  }
  function add() {
    onChange([...checklist, emptyChecklistItem()]);
  }

  const sorted = [...checklist].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <section className="card">
      <h2>준비 체크리스트</h2>
      <p className="hint">출발 전 처리해야 할 일들을 마감일과 함께 관리하세요.</p>

      {checklist.length > 0 && (
        <div className="summary-bar">
          <span>
            완료 <b>{doneCount}</b> / {checklist.length}
          </span>
        </div>
      )}

      {checklist.length === 0 && mode === 'view' && <p className="hint" style={{ margin: 0 }}>등록된 체크리스트가 없습니다.</p>}

      {sorted.map((c) => (
        <div key={c.id} className={`check-row ${c.done ? 'done' : ''}`}>
          <input
            type="checkbox"
            checked={c.done}
            onChange={(e) => update(c.id, { done: e.target.checked })}
            aria-label="완료 여부"
          />
          {mode === 'edit' ? (
            <>
              <input
                className="cl-input"
                style={{ flex: 1 }}
                value={c.text}
                onChange={(e) => update(c.id, { text: e.target.value })}
                placeholder="할 일"
                aria-label="할 일"
              />
              <input type="date" value={c.due} onChange={(e) => update(c.id, { due: e.target.value })} aria-label="마감일" />
              <button className="ghost danger row-delete" onClick={() => remove(c.id)} aria-label="항목 삭제">
                삭제
              </button>
            </>
          ) : (
            <>
              <span className="cl-text" style={{ flex: 1, fontSize: 13.5 }}>
                {c.text || '(내용 없음)'}
              </span>
              {c.due && (
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                  {c.due}
                </span>
              )}
            </>
          )}
        </div>
      ))}

      {mode === 'edit' && (
        <button className="add-row-btn" onClick={add} aria-label="체크리스트 항목 추가">
          + 항목 추가
        </button>
      )}
    </section>
  );
}
