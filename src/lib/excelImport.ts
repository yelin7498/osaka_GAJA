import * as XLSX from 'xlsx';
import { ItineraryItem, TripDay, TRANSPORT_OPTIONS, TransportType, emptyDay, newId } from '@/lib/types';

// 엑셀/CSV 가져오기 기능
// 원본 엑셀 형식이 일정하지 않을 수 있으므로, 실제 데이터 컬럼을
// 우리 스키마(날짜/시작시간/종료시간/일정명/장소/이동수단/메모)에 사용자가
// 직접 연결(매핑)할 수 있도록 분리했습니다.

export type ImportField =
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'title'
  | 'location'
  | 'transport'
  | 'memo'
  | 'ignore';

export interface ParsedSheet {
  headers: string[];
  rows: string[][]; // 원본 문자열 그대로 (미리보기용)
}

export function parseWorkbookFirstSheet(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
  if (raw.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...rest] = raw as string[][];
  const headers = headerRow.map((h) => String(h ?? '').trim());
  const rows = rest.map((r) => headers.map((_, i) => String(r[i] ?? '').trim()));
  return { headers, rows };
}

// 자유 텍스트를 이동수단 옵션 중 가장 가까운 값으로 매칭 (없으면 '기타')
function normalizeTransport(value: string): TransportType {
  const v = value.trim();
  const found = TRANSPORT_OPTIONS.find((opt) => opt === v);
  if (found) return found;
  if (!v) return '';
  return '기타';
}

// "9:10", "09:10:00", "0910" 등 다양한 표기를 "HH:mm"으로 최대한 보정
function normalizeTime(value: string): string {
  const v = value.trim();
  if (!v) return '';
  const hm = v.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return `${hm[1].padStart(2, '0')}:${hm[2]}`;
  const compact = v.match(/^(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}:${compact[2]}`;
  return v;
}

// 날짜 표기를 "YYYY-MM-DD"로 최대한 보정
function normalizeDate(value: string): string {
  const v = value.trim();
  if (!v) return '';
  const iso = v.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  return v;
}

export interface ImportResult {
  days: TripDay[];
  itemCount: number;
}

// mapping: 헤더 인덱스 -> 필드
export function buildDaysFromRows(
  headers: string[],
  rows: string[][],
  mapping: Record<number, ImportField>
): ImportResult {
  const fieldIndex = (field: ImportField): number =>
    headers.findIndex((_, i) => mapping[i] === field);

  const dateIdx = fieldIndex('date');
  const startIdx = fieldIndex('startTime');
  const endIdx = fieldIndex('endTime');
  const titleIdx = fieldIndex('title');
  const locationIdx = fieldIndex('location');
  const transportIdx = fieldIndex('transport');
  const memoIdx = fieldIndex('memo');

  const dayMap = new Map<string, TripDay>();
  let order = 1;
  let itemCount = 0;

  rows.forEach((row) => {
    const dateRaw = dateIdx >= 0 ? row[dateIdx] : '';
    const dateKey = normalizeDate(dateRaw) || '미지정';

    if (!dayMap.has(dateKey)) {
      const day = emptyDay(dayMap.size + 1, dateKey === '미지정' ? '' : dateKey);
      day.items = []; // emptyDay가 만든 빈 항목 제거하고 실제 데이터로 채움
      day.title = dateKey === '미지정' ? `Day ${dayMap.size + 1}` : dateKey;
      dayMap.set(dateKey, day);
    }

    const title = titleIdx >= 0 ? row[titleIdx] : '';
    const location = locationIdx >= 0 ? row[locationIdx] : '';
    const hasContent = title || location || (startIdx >= 0 && row[startIdx]);
    if (!hasContent) return;

    const item: ItineraryItem = {
      id: newId('item'),
      startTime: startIdx >= 0 ? normalizeTime(row[startIdx]) : '',
      endTime: endIdx >= 0 ? normalizeTime(row[endIdx]) : '',
      title,
      location,
      transport: transportIdx >= 0 ? normalizeTransport(row[transportIdx]) : '',
      description: '',
      memo: memoIdx >= 0 ? row[memoIdx] : '',
      order: order++,
    };
    dayMap.get(dateKey)!.items.push(item);
    itemCount++;
  });

  return { days: Array.from(dayMap.values()), itemCount };
}

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  date: '날짜',
  startTime: '시작 시간',
  endTime: '종료 시간',
  title: '일정명',
  location: '장소',
  transport: '이동수단',
  memo: '메모',
  ignore: '(사용 안 함)',
};
