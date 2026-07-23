// 여행 일정 데이터 구조 정의
// 이 파일의 타입은 Supabase의 trips.trip_data(JSONB) 컬럼에 그대로 저장됩니다.

export const TRANSPORT_OPTIONS = [
  '도보',
  '택시',
  '지하철',
  '기차',
  '버스',
  '차량',
  '기타',
] as const;

export type TransportType = (typeof TRANSPORT_OPTIONS)[number] | '';

export interface ItineraryItem {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  title: string;
  location: string;
  transport: TransportType;
  description: string;
  memo: string;
  order: number;
}

export interface TripDay {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  items: ItineraryItem[];
}

export interface TripData {
  id: string;
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  travelers: number;
  hotel: string;
  description: string;
  days: TripDay[];
  createdAt: string;
  updatedAt: string;
}

// DB row 형태 (trips 테이블). trip_data 안에 TripData가 그대로 들어있습니다.
export interface TripRow {
  id: string;
  slug: string;
  title: string;
  trip_data: TripData;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyItem(order: number): ItineraryItem {
  return {
    id: newId('item'),
    startTime: '',
    endTime: '',
    title: '',
    location: '',
    transport: '',
    description: '',
    memo: '',
    order,
  };
}

export function emptyDay(dayNumber: number, date = ''): TripDay {
  return {
    id: newId('day'),
    date,
    title: `Day ${dayNumber}`,
    items: [emptyItem(1)],
  };
}

export function createBlankTrip(overrides: Partial<TripData> = {}): TripData {
  const now = new Date().toISOString();
  return {
    id: newId('trip'),
    slug: '',
    title: '새로운 가족여행',
    startDate: '',
    endDate: '',
    travelers: 2,
    hotel: '',
    description: '',
    days: [emptyDay(1)],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
