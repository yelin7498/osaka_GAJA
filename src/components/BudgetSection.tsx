'use client';

import { BudgetItem, BUDGET_CATEGORIES, Currency, emptyBudgetItem } from '@/lib/types';

function won(n: number) {
  return `${Math.round(n || 0).toLocaleString('ko-KR')}원`;
}
function toKRW(amount: number, currency: Currency, exRate: number) {
  return currency === 'JPY' ? (amount * exRate) / 100 : amount;
}

interface Props {
  budget: BudgetItem[];
  exRate: number;
  mode: 'view' | 'edit';
  onChangeBudget: (budget: BudgetItem[]) => void;
  onChangeExRate: (rate: number) => void;
}

export default function BudgetSection({ budget, exRate, mode, onChangeBudget, onChangeExRate }: Props) {
  function update(id: string, patch: Partial<BudgetItem>) {
    onChangeBudget(budget.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function remove(id: string) {
    onChangeBudget(budget.filter((b) => b.id !== id));
  }
  function add() {
    onChangeBudget([...budget, emptyBudgetItem()]);
  }

  const total = budget.reduce((s, b) => s + toKRW(Number(b.amount) || 0, b.currency, exRate), 0);

  return (
    <section className="card">
      <h2>예산 계획</h2>
      <p className="hint">항목별 예산을 원화 또는 엔화로 입력하면, 아래 환율 기준으로 총액을 원화로 환산해 보여줍니다.</p>

      <div className="summary-bar">
        <span>
          100엔당 환율{' '}
          {mode === 'edit' ? (
            <input
              type="number"
              className="mono"
              style={{ width: 80, display: 'inline-block' }}
              value={exRate}
              onChange={(e) => onChangeExRate(Number(e.target.value) || 0)}
              aria-label="100엔당 환율"
            />
          ) : (
            <b>{exRate}</b>
          )}{' '}
          원
        </span>
        <span>
          총 예산 <b>{won(total)}</b>
        </span>
      </div>

      {budget.length === 0 && mode === 'view' && <p className="hint" style={{ margin: 0 }}>등록된 예산 항목이 없습니다.</p>}

      {budget.map((b) =>
        mode === 'edit' ? (
          <div
            key={b.id}
            className="section-row"
            style={{ gridTemplateColumns: '1.2fr 0.8fr 1fr 1.6fr auto' }}
          >
            <select value={b.category} onChange={(e) => update(b.id, { category: e.target.value })} aria-label="분류">
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={b.currency}
              onChange={(e) => update(b.id, { currency: e.target.value as Currency })}
              aria-label="통화"
            >
              <option value="KRW">원화</option>
              <option value="JPY">엔화</option>
            </select>
            <input
              type="number"
              className="mono"
              value={b.amount}
              onChange={(e) => update(b.id, { amount: Number(e.target.value) || 0 })}
              aria-label="금액"
            />
            <input value={b.note} onChange={(e) => update(b.id, { note: e.target.value })} placeholder="메모" aria-label="메모" />
            <button className="ghost danger row-delete" onClick={() => remove(b.id)} aria-label="예산 항목 삭제">
              삭제
            </button>
          </div>
        ) : (
          <div key={b.id} className="item-view">
            <div className="iv-time">{b.category}</div>
            <div className="iv-main">
              <div className="iv-activity">
                {b.currency === 'JPY' ? `¥${Math.round(b.amount).toLocaleString('ko-KR')}` : won(b.amount)}
                {b.currency === 'JPY' && <span className="iv-place"> (약 {won(toKRW(b.amount, 'JPY', exRate))})</span>}
              </div>
              {b.note && <div className="iv-memo">{b.note}</div>}
            </div>
          </div>
        )
      )}

      {mode === 'edit' && (
        <button className="add-row-btn" onClick={add} aria-label="예산 항목 추가">
          + 예산 항목 추가
        </button>
      )}
    </section>
  );
}
