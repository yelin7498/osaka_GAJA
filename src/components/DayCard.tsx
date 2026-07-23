'use client';

import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TripDay, ItineraryItem, emptyItem } from '@/lib/types';
import ItemRow from './ItemRow';

interface Props {
  day: TripDay;
  dayIndex: number;
  mode: 'view' | 'edit';
  onChangeDay: (patch: Partial<TripDay>) => void;
  onDeleteDay: () => void;
  canDeleteDay: boolean;
}

export default function DayCard({ day, dayIndex, mode, onChangeDay, onDeleteDay, canDeleteDay }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedItems = [...day.items].sort((a, b) => a.order - b.order);

  function updateItem(itemId: string, patch: Partial<ItineraryItem>) {
    onChangeDay({
      items: day.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    });
  }

  function deleteItem(itemId: string) {
    onChangeDay({ items: day.items.filter((it) => it.id !== itemId) });
  }

  function addItem() {
    const maxOrder = day.items.reduce((m, it) => Math.max(m, it.order), 0);
    onChangeDay({ items: [...day.items, emptyItem(maxOrder + 1)] });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedItems.findIndex((it) => it.id === active.id);
    const newIndex = sortedItems.findIndex((it) => it.id === over.id);
    const reordered = arrayMove(sortedItems, oldIndex, newIndex).map((it, i) => ({ ...it, order: i + 1 }));
    onChangeDay({ items: reordered });
  }

  function handleDeleteDay() {
    if (window.confirm(`"${day.title || `Day ${dayIndex + 1}`}" 날짜 섹션을 삭제할까요? 안의 모든 일정이 함께 삭제됩니다.`)) {
      onDeleteDay();
    }
  }

  return (
    <section className="card day-card">
      <div className="day-title">
        {mode === 'edit' ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <input
              value={day.title}
              onChange={(e) => onChangeDay({ title: e.target.value })}
              placeholder={`Day ${dayIndex + 1}`}
              style={{ maxWidth: 220 }}
              aria-label="날짜 제목"
            />
            <input
              type="date"
              className="day-date-input"
              value={day.date}
              onChange={(e) => onChangeDay({ date: e.target.value })}
              aria-label="날짜"
            />
          </div>
        ) : (
          <h3>
            {day.title || `Day ${dayIndex + 1}`}
            {day.date && <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: 12, marginLeft: 8 }}>{day.date}</span>}
          </h3>
        )}

        {mode === 'edit' && canDeleteDay && (
          <button className="ghost danger" onClick={handleDeleteDay} aria-label="이 날짜 섹션 삭제">
            날짜 삭제
          </button>
        )}
      </div>

      {sortedItems.length === 0 && mode === 'view' && (
        <p className="hint" style={{ margin: 0 }}>등록된 일정이 없습니다.</p>
      )}

      {mode === 'edit' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {sortedItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                mode="edit"
                onChange={(patch) => updateItem(item.id, patch)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        sortedItems.map((item) => <ItemRow key={item.id} item={item} mode="view" onChange={() => {}} onDelete={() => {}} />)
      )}

      {mode === 'edit' && (
        <button className="add-row-btn" onClick={addItem} aria-label="일정 항목 추가">
          + 일정 추가
        </button>
      )}
    </section>
  );
}
