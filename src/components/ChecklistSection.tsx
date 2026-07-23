'use client';

import { useState, type ReactNode } from 'react';
import { ChecklistItem, emptyChecklistItem } from '@/lib/types';

interface Props {
  checklist: ChecklistItem[];
  mode: 'view' | 'edit';
  onChange: (checklist: ChecklistItem[]) => void;
  tripStartDate?: string;
  tripEndDate?: string;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function dstr(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

// 오늘 + 여행 시작/종료일 + 체크리스트 마감일이 속한 달들을 (중복 없이, 순서대로) 계산합니다.
function monthsToShow(checklist: ChecklistItem[], startDate?: string, endDate?: string) {
  const dates: Date[] = [new Date()];
  if (startDate) dates.push(new Date(startDate));
  if (endDate) dates.push(new Date(endDate));
  checklist.forEach((c) => {
    if (c.due) dates.push(new Date(c.due));
  });
  const seen = new Set<string>();
  const out: { y: number; m: number }[] = [];
  dates.forEach((d) => {
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ y: d.getFullYear(), m: d.getMonth() });
    }
  });
  return out.sort((a, b) => a.y - b.y || a.m - b.m);
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

function MonthCalendar({
  y,
  m,
  checklist,
  startDate,
  endDate,
  selected,
  onSelectDate,
}: {
  y: number;
  m: number;
  checklist: ChecklistItem[];
  startDate?: string;
  endDate?: string;
  selected: string | null;
  onSelectDate: (d: string) => void;
}) {
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const cells: ReactNode[] = [];
  for (let i = 0; i < first; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-cell empty" />);
  }
  for (let d = 1; d <= total; d++) {
    const ds = dstr(y, m, d);
    const isTrip = !!startDate && !!endDate && ds >= startDate && ds <= endDate;
    const isSelected = selected === ds;
    const tasks = checklist.filter((c) => c.due === ds);
    cells.push(
      <div
        key={ds}
        className={`cal-cell ${isTrip ? 'trip' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectDate(ds)}
      >
        <div className="daynum">{d}</div>
        {/* 점/일정 표시는 정보 전달용입니다. 날짜 클릭으로만 선택되도록 별도 클릭 핸들러를 두지 않습니다. */}
        {tasks.map((t) => (
          <div key={t.id} className={`cal-task ${t.done ? 'done' : ''}`}>
            <span className="dot" />
            <span className="t">{t.text || '(내용 없음)'}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="cal-month-title">{y}년 {m + 1}월</div>
      <div className="cal-grid">
        {DOW.map((w) => (
          <div key={w} className="cal-dow">{w}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}

export default function ChecklistSection({ checklist, mode, onChange, tripStartDate, tripEndDate }: Props) {
  const [filterDate, setFilterDate] = useState<string | null>(null);

  function update(id: string, patch: Partial<ChecklistItem>) {
    onChange(checklist.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function remove(id: string) {
    onChange(checklist.filter((c) => c.id !== id));
  }
  function add() {
    const item = emptyChecklistItem();
    // 날짜를 선택한 상태(필터 중)라면 그 날짜를 마감일로 바로 채워서 추가합니다.
    // (그렇지 않으면 마감일이 없어 필터된 목록에 보이지 않아 "추가가 안 되는" 것처럼 보였습니다.)
    if (filterDate) item.due = filterDate;
    onChange([...checklist, item]);
  }
  function selectDate(d: string) {
    setFilterDate((prev) => (prev === d ? null : d));
  }

  const months = monthsToShow(checklist, tripStartDate, tripEndDate);
  // 필터 중에는: 마감일이 그 날짜까지인 항목만 보여주되, 이미 완료된 항목은
  // 그 마감일이 지난 뒤(선택한 날짜보다 이전 마감일)까지 계속 노출하지 않습니다.
  // 필터가 없는 "전체" 보기에서는 완료 여부와 상관없이 모두 보여줍니다.
  const listSource = filterDate
    ? checklist.filter((c) => c.due && c.due <= filterDate && (!c.done || c.due === filterDate))
    : checklist;
  // 급한 일정(마감일이 이른) 순으로 정렬하고, 완료된 항목은 맨 아래로 보냅니다.
  const sorted = [...listSource].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <section className="card">
      <h2>출발 전 체크리스트 캘린더</h2>
      <p className="hint">
        각 항목에 마감일을 정하면 아래 달력에 표시돼요. 여행 기간
        {tripStartDate && tripEndDate ? ` (${tripStartDate} ~ ${tripEndDate})` : ''}은 붉게 표시됩니다. 날짜를 클릭하면 그날까지 해야 할 일만 볼 수 있어요.
      </p>

      {checklist.length > 0 && (
        <div className="summary-bar">
          <span>완료 <b>{doneCount}</b> / {checklist.length}</span>
        </div>
      )}

      {months.map(({ y, m }) => (
        <MonthCalendar
          key={`${y}-${m}`}
          y={y}
          m={m}
          checklist={checklist}
          startDate={tripStartDate}
          endDate={tripEndDate}
          selected={filterDate}
          onSelectDate={selectDate}
        />
      ))}

      {filterDate && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            margin: '14px 0 4px',
            padding: '8px 12px',
            background: 'var(--line-soft)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 12.5, color: 'var(--indigo)', fontWeight: 600 }}>
            📅 {filterDate}까지 해야 할 일 ({sorted.length}개)
          </span>
          <button className="ghost" onClick={() => setFilterDate(null)} aria-label="전체 보기">
            전체 보기
          </button>
        </div>
      )}

      {checklist.length === 0 && mode === 'view' && <p className="hint" style={{ margin: 0 }}>등록된 체크리스트가 없습니다.</p>}
      {checklist.length > 0 && sorted.length === 0 && (
        <p className="hint" style={{ margin: '10px 0 0' }}>이 날짜까지 마감인 항목이 없어요.</p>
      )}

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
              <span className="cl-text" title={c.text || '(내용 없음)'} style={{ flex: 1, fontSize: 13.5 }}>
                {c.text || '(내용 없음)'}
              </span>
              {c.due && (
                <span className="mono cl-due" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
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
