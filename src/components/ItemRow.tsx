'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItineraryItem, TRANSPORT_OPTIONS } from '@/lib/types';

interface Props {
  item: ItineraryItem;
  mode: 'view' | 'edit';
  onChange: (patch: Partial<ItineraryItem>) => void;
  onDelete: () => void;
}

export default function ItemRow({ item, mode, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (mode === 'view') {
    const timeLabel = [item.startTime, item.endTime].filter(Boolean).join(' - ');
    return (
      <div className="item-view">
        <div className="iv-time mono">{timeLabel || '시간 미정'}</div>
        <div className="iv-main">
          <div className={`iv-activity ${!item.title ? 'iv-empty' : ''}`}>{item.title || '일정 미입력'}</div>
          {item.location && <div className="iv-place">📍 {item.location}</div>}
          {item.description && <div className="iv-desc">{item.description}</div>}
          {item.memo && <div className="iv-memo">📝 {item.memo}</div>}
          {item.transport && <span className="iv-transport-tag">{item.transport}</span>}
        </div>
      </div>
    );
  }

  function handleDelete() {
    if (window.confirm('이 일정을 삭제할까요? 삭제하면 되돌릴 수 없습니다.')) {
      onDelete();
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="item-edit-row">
      <div className="drag-handle" {...attributes} {...listeners} aria-label="드래그하여 순서 변경" title="드래그하여 순서 변경">
        ⠿
      </div>
      <div>
        <div className="item-edit-grid">
          <div>
            <label className="f">시작 시간</label>
            <input type="time" value={item.startTime} onChange={(e) => onChange({ startTime: e.target.value })} aria-label="시작 시간" />
          </div>
          <div>
            <label className="f">종료 시간</label>
            <input type="time" value={item.endTime} onChange={(e) => onChange({ endTime: e.target.value })} aria-label="종료 시간" />
          </div>
          <div>
            <label className="f">일정명</label>
            <input value={item.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="예: 오사카성 관람" aria-label="일정명" />
          </div>
          <div>
            <label className="f">장소</label>
            <input value={item.location} onChange={(e) => onChange({ location: e.target.value })} placeholder="장소" aria-label="장소" />
          </div>
          <div>
            <label className="f">이동수단</label>
            <select value={item.transport} onChange={(e) => onChange({ transport: e.target.value as ItineraryItem['transport'] })} aria-label="이동수단">
              <option value="">선택 안 함</option>
              {TRANSPORT_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="item-edit-grid2">
          <div>
            <label className="f">설명</label>
            <textarea rows={2} value={item.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="상세 설명(선택)" aria-label="설명" />
          </div>
          <div>
            <label className="f">메모</label>
            <textarea rows={2} value={item.memo} onChange={(e) => onChange({ memo: e.target.value })} placeholder="메모(선택)" aria-label="메모" />
          </div>
        </div>
      </div>
      <button className="ghost danger" onClick={handleDelete} aria-label="이 일정 삭제" title="일정 삭제">✕</button>
    </div>
  );
}
