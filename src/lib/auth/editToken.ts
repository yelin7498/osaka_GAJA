// ----------------------------------------------------------------------------
// 편집 권한(editToken) 관련 유틸리티
//
// 지금은 "회원가입 없는" 간단한 버전입니다:
//  - 여행 일정을 처음 만들 때 서버가 무작위 토큰(editToken)을 1회 발급합니다.
//  - 브라우저 localStorage에 slug별로 저장해 둡니다.
//  - 수정 요청을 보낼 때마다 이 토큰을 함께 보내고, 서버는 저장된 해시값과 비교합니다.
//  - 토큰 원문은 DB에 저장하지 않고 해시값만 저장합니다 (src/app/api 참고).
//
// 추후 Supabase Auth를 붙일 때는 이 파일의 함수들을
// "로그인한 사용자가 owner_id 와 일치하는지 확인" 하는 방식으로 바꾸기만 하면 되도록
// 편집 권한 확인 로직을 이 한 곳에 모아두었습니다.
// ----------------------------------------------------------------------------

const STORAGE_PREFIX = 'trip_edit_token_';

export function saveEditTokenLocally(slug: string, token: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + slug, token);
  } catch {
    // localStorage 사용 불가(시크릿 모드 등) - 조용히 무시
  }
}

export function getEditTokenLocally(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + slug);
  } catch {
    return null;
  }
}

export function clearEditTokenLocally(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + slug);
  } catch {
    // ignore
  }
}

// 최근에 만들었거나 열어본 여행 목록(메인 페이지 "기존 일정 불러오기"에서 사용)
const RECENT_KEY = 'trip_recent_list';
export interface RecentTrip {
  slug: string;
  title: string;
  visitedAt: string;
}

export function addRecentTrip(entry: RecentTrip) {
  if (typeof window === 'undefined') return;
  try {
    const list = getRecentTrips().filter((t) => t.slug !== entry.slug);
    list.unshift(entry);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    // ignore
  }
}

export function getRecentTrips(): RecentTrip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentTrip[]) : [];
  } catch {
    return [];
  }
}
