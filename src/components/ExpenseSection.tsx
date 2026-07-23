'use client';

import { BUDGET_CATEGORIES, Currency, ExpenseItem, PAYMENT_METHODS, emptyExpense } from '@/lib/types';

function won(n: number) {
  return `${Math.round(n || 0).toLocaleString('ko-KR')}원`;
}
function toKRW(amount: number, currency: Currency, exRate: number) {
  return currency === 'JPY' ? (amount * exRate) / 100 : amount;
}

interface Props {
  expenses: ExpenseItem[];
  exRate: number;
  mode: 'view' | 'edit';
  onChange: (expenses: ExpenseItem[]) => void;
}

export default function ExpenseSection({ expenses, exRate, mode, onChange }: Props) {
  function update(id: string, patch: Partial<ExpenseItem>) {
    onChange(expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function remove(id: string) {
    onChange(expenses.filter((e) => e.id !== id));
  }
  function add() {
    onChange([...expenses, emptyExpense()]);
  }

  const total = expenses.reduce((s, e) => s + toKRW(Number(e.amount) || 0, e.currency, exRate), 0);

  return (
    <section className="card">
      <h2>지출 내역</h2>
      <p className="hint">여행 중 실제로 쓴 돈을 하나씩 기록해두면, 예산과 비교하기 좋아요.</p>

      <div className="summary-bar">
        <span>
          지출 합계 <b>{won(total)}</b>
        </span>
        <span>
          기록 <b>{expenses.length}건</b>
        </span>
      </div>

      {expenses.length === 0 && mode === 'view' && <p className="hint" style={{ margin: 0 }}>등록된 지출 내역이 없습니다.</p>}

      {expenses.map((e) =>
        mode === 'edit' ? (
          <div
            key={e.id}
            className="section-row"
            style={{ gridTemplateColumns: '110px 1.4fr 1fr 0.7fr 1fr 0.9fr 1.4fr auto' }}
          >
            <input type="date" value={e.date} onChange={(ev) => update(e.id, { date: ev.target.value })} aria-label="날짜" />
            <input value={e.item} onChange={(ev) => update(e.id, { item: ev.target.value })} placeholder="지출 항목" aria-label="항목" />
            <select value={e.category} onChange={(ev) => update(e.id, { category: ev.target.value })} aria-label="분류">
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={e.currency}
              onChange={(ev) => update(e.id, { currency: ev.target.value as Currency })}
              aria-label="통화"
            >
              <option value="KRW">원</option>
              <option value="JPY">엔</option>
            </select>
            <input
              type="number"
              className="mono"
              value={e.amount}
              onChange={(ev) => update(e.id, { amount: Number(ev.target.value) || 0 })}
              aria-label="금액"
            />
            <select value={e.payment} onChange={(ev) => update(e.id, { payment: ev.target.value })} aria-label="결제수단">
              {PAYMENT_METHODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input value={e.memo} onChange={(ev) => update(e.id, { memo: ev.target.value })} placeholder="메모" aria-label="메모" />
            <button className="ghost danger row-delete" onClick={() => remove(e.id)} aria-label="지출 삭제">
              삭제
            </button>
          </div>
        ) : (
          <div key={e.id} className="item-view">
            <div className="iv-time">{e.date || '-'}</div>
            <div className="iv-main">
              <div className="iv-activity">
                {e.item || '(항목 없음)'} · {e.currency === 'JPY' ? `¥${Math.round(e.amount).toLocaleString('ko-KR')}` : won(e.amount)}
              </div>
              <div className="iv-place">
                {e.category} · {e.payment}
              </div>
              {e.memo && <div className="iv-memo">{e.memo}</div>}
            </div>
          </div>
        )
      )}

      {mode === 'edit' && (
        <button className="add-row-btn" onClick={add} aria-label="지출 추가">
          + 지출 추가
        </button>
      )}
    </section>
  );
}
