// 한글 제목은 그대로 로마자로 바꾸기 어렵기 때문에,
// "영문 별명(선택 입력) + 랜덤 코드" 조합으로 사람이 읽을 수 있는 slug를 만듭니다.
// 예: fukui-family-trip, my-trip-a1b2c3d4

export function slugifyBase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function randomCode(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const arr = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * chars.length);
  }
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export function generateSlug(customName?: string): string {
  const base = customName ? slugifyBase(customName) : '';
  return base ? `${base}-${randomCode(4)}` : `trip-${randomCode(8)}`;
}
