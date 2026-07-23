'use client';

import type { ChangeEvent } from 'react';
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

// 원본 html과 동일하게, 올린 사진을 캔버스로 축소(최대 폭 420px)해 JPEG로 압축한 뒤
// data URL 형태로 저장합니다. 별도 파일 저장소 없이 trip_data(JSONB)에 그대로 들어갑니다.
function readAndCompressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 420;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('캔버스를 사용할 수 없습니다.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
      img.src = String(ev.target?.result || '');
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

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

  async function handlePhotoChange(id: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 초기화
    if (!file) return;
    try {
      const dataUrl = await readAndCompressPhoto(file);
      update(id, { photo: dataUrl });
    } catch {
      // 조용히 무시 (지원하지 않는 파일 형식 등)
    }
  }

  return (
    <section className="card">
      <h2>코디 계획</h2>
      <p className="hint">사진 영역을 눌러 코디 사진을 올리고, 날짜별로 입을 옷과 소품을 미리 정리해두면 짐 싸기가 훨씬 편해져요.</p>

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

          <div className="outfit-grid">
            <div className="photo-slot">
              {o.photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.photo} alt={`${o.label || `Day ${i + 1}`} 코디 사진`} />
                  {mode === 'edit' && (
                    <button
                      type="button"
                      className="remove-photo"
                      onClick={() => update(o.id, { photo: null })}
                      aria-label="사진 삭제"
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : mode === 'edit' ? (
                <>
                  <span className="ph-label">📷<br />사진 올리기</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(o.id, e)}
                    aria-label="코디 사진 올리기"
                  />
                </>
              ) : (
                <span className="ph-label">사진 없음</span>
              )}
            </div>

            <div>
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
          </div>
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
