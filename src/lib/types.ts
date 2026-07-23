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

export type Currency = 'KRW' | 'JPY';

export const BUDGET_CATEGORIES = [
  '항공권',
  '숙박',
  '현지 교통',
  '식비',
  '관광/체험',
  '쇼핑',
  '통신(유심/와이파이)',
  '기타/예비비',
] as const;

export const PAYMENT_METHODS = ['현금', '카드', '기타'] as const;
export const PRIORITY_LEVELS = ['상', '중', '하'] as const;

export interface BudgetItem {
  id: string;
  category: string;
  currency: Currency;
  amount: number;
  note: string;
}

export interface ExpenseItem {
  id: string;
  date: string;
  item: string;
  category: string;
  currency: Currency;
  amount: number;
  payment: string;
  memo: string;
}

export interface OutfitDay {
  id: string;
  label: string;
  hair: string;
  outer: string;
  top: string;
  bottom: string;
  shoes: string;
  bag: string;
  memo: string;
  photo: string | null; // 압축된 JPEG data URL (원본 html과 동일하게 최대 420px 폭으로 리사이즈해 저장)
}

export interface ChecklistItem {
  id: string;
  text: string;
  due: string;
  done: boolean;
}

export interface PackingItem {
  id: string;
  category: string;
  text: string;
  done: boolean;
}

export interface Spot {
  id: string;
  region: string;
  name: string;
  category: string;
  priority: string;
  visited: boolean;
  memo: string;
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
  exRate: number; // 엔화->원화 환율 (예: 900 이면 100엔 = 900원 기준으로 사용)
  days: TripDay[];
  budget: BudgetItem[];
  expenses: ExpenseItem[];
  outfits: OutfitDay[];
  checklist: ChecklistItem[];
  packing: PackingItem[];
  spots: Spot[];
  createdAt: string;
  updatedAt: string;
}

// 이전 버전(일정표만 있던 시절)에 만들어진 trip_data를 열 때도 깨지지 않도록
// 누락된 필드를 기본값으로 채워줍니다.
export function normalizeTrip(trip: Partial<TripData> & { days: TripDay[] }): TripData {
  return {
    id: trip.id ?? newId('trip'),
    slug: trip.slug ?? '',
    title: trip.title ?? '새로운 가족여행',
    startDate: trip.startDate ?? '',
    endDate: trip.endDate ?? '',
    travelers: trip.travelers ?? 2,
    hotel: trip.hotel ?? '',
    description: trip.description ?? '',
    exRate: trip.exRate ?? 900,
    days: trip.days ?? [],
    budget: trip.budget ?? [],
    expenses: trip.expenses ?? [],
    outfits: (trip.outfits ?? []).map((o) => ({ ...o, photo: o.photo ?? null })),
    checklist: trip.checklist ?? [],
    packing: trip.packing ?? [],
    spots: trip.spots ?? [],
    createdAt: trip.createdAt ?? new Date().toISOString(),
    updatedAt: trip.updatedAt ?? new Date().toISOString(),
  };
}

export function emptyBudgetItem(): BudgetItem {
  return { id: newId('budget'), category: BUDGET_CATEGORIES[0], currency: 'KRW', amount: 0, note: '' };
}

export function emptyExpense(): ExpenseItem {
  return { id: newId('expense'), date: '', item: '', category: BUDGET_CATEGORIES[0], currency: 'JPY', amount: 0, payment: '현금', memo: '' };
}

export function emptyOutfit(label = ''): OutfitDay {
  return { id: newId('outfit'), label, hair: '', outer: '', top: '', bottom: '', shoes: '', bag: '', memo: '', photo: null };
}

export function emptyChecklistItem(): ChecklistItem {
  return { id: newId('check'), text: '', due: '', done: false };
}

export function emptyPackingItem(): PackingItem {
  return { id: newId('pack'), category: '기타', text: '', done: false };
}

export function emptySpot(): Spot {
  return { id: newId('spot'), region: '', name: '', category: '', priority: '중', visited: false, memo: '' };
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
    exRate: 900,
    days: [emptyDay(1)],
    budget: [],
    expenses: [],
    outfits: [],
    checklist: [],
    packing: [],
    spots: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
