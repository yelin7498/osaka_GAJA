'use client';

import { useState } from 'react';
import { parseWorkbookFirstSheet, buildDaysFromRows, ImportField, IMPORT_FIELD_LABELS } from '@/lib/excelImport';
import { TripDay } from '@/lib/types';

interface Props {
  onClose: () => void;
  onImport: (days: TripDay[]) => void;
}

const FIELD_ORDER: ImportField[] = ['date', 'startTime', 'endTime', 'title', 'location', 'transport', 'memo', 'ignore'];

// 헤더 이름으로 필드를 추측 (완벽하지 않으므로 사용자가 화면에서 다시 바꿀 수 있습니다)
function guessField(header: string): ImportField {
  const h = header.toLowerCase();
  if (/날짜|date/.test(h)) return 'date';
  if (/시작|start/.test(h)) return 'startTime';
  if (/종료|끝|end/.test(h)) return 'endTime';
  if (/시간|time/.test(h)) return 'startTime';
  if (/일정|제목|활동|title|activity/.test(h)) return 'title';
  if (/장소|위치|location|place/.test(h)) return 'location';
  if (/이동|교통|transport/.test(h)) return 'transport';
  if (/메모|비고|memo|note/.test(h)) return 'memo';
  return 'ignore';
}

export default function ExcelImportModal({ onClose, onImport }: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, ImportField>>({});
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbookFirstSheet(buffer);
      if (parsed.headers.length === 0) {
        setError('파일에서 데이터를 찾을 수 없습니다. 첫 번째 시트에 표 형태로 데이터를 넣어주세요.');
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const guessed: Record<number, ImportField> = {};
      parsed.headers.forEach((h, i) => (guessed[i] = guessField(h)));
      setMapping(guessed);
    } catch (err) {
      setError('파일을 읽는 중 오류가 발생했습니다. .xlsx 또는 .csv 파일인지 확인해주세요.');
    }
  }

  function handleConfirm() {
    const { days, itemCount } = buildDaysFromRows(headers, rows, mapping);
    if (itemCount === 0) {
      setError('가져올 일정이 없습니다. 컬럼 연결을 다시 확인해주세요.');
      return;
    }
    onImport(days);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>엑셀/CSV로 일정 가져오기</h2>
        <p className="hint">
          .xlsx 또는 .csv 파일의 첫 번째 시트를 읽습니다. 날짜별로 새로운 날짜 섹션이 자동으로 만들어지며,
          기존 일정 뒤에 추가됩니다.
        </p>

        <label className="f">파일 선택</label>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} aria-label="엑셀 또는 CSV 파일 선택" />
        {fileName && <p className="hint">선택한 파일: {fileName}</p>}
        {error && <p style={{ color: 'var(--danger)', fontSize: 12.5 }}>{error}</p>}

        {headers.length > 0 && (
          <>
            <h3 className="display-h" style={{ marginTop: 18 }}>컬럼 연결</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
              {headers.map((h, i) => (
                <div key={i}>
                  <label className="f">&quot;{h || `(빈 헤더 ${i + 1})`}&quot; 컬럼은?</label>
                  <select
                    value={mapping[i] ?? 'ignore'}
                    onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value as ImportField }))}
                    aria-label={`${h} 컬럼 매핑`}
                  >
                    {FIELD_ORDER.map((f) => (
                      <option key={f} value={f}>{IMPORT_FIELD_LABELS[f]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <h3 className="display-h">미리보기 (상위 5행)</h3>
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table className="excel-preview">
                <thead>
                  <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, ri) => (
                    <tr key={ri}>{r.map((c, ci) => <td key={ci}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} aria-label="가져오기 취소">취소</button>
          <button className="primary" onClick={handleConfirm} disabled={headers.length === 0} aria-label="일정으로 가져오기">
            일정으로 가져오기
          </button>
        </div>
      </div>
    </div>
  );
}
