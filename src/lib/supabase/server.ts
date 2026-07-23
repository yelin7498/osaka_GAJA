import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 서버(Route Handler) 전용 Supabase 클라이언트.
// SUPABASE_SERVICE_ROLE_KEY는 RLS를 우회하는 강력한 키이므로
// 절대 클라이언트 번들에 포함되면 안 됩니다. 이 파일은 "use server" 경계인
// app/api/** 안에서만 import 하세요.
//
// 함수 내부에서 지연 생성(lazy init)하는 이유:
// 빌드 타임에는 환경변수가 없을 수 있는데, 모듈 최상단에서 createClient를
// 호출하면 빌드/배포 파이프라인이 실패할 수 있기 때문입니다.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 .env.local 에 설정하세요.'
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// ---- editToken 발급 / 해시 -------------------------------------------------

export function generateEditToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 256bit 무작위 값
}

export function hashEditToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyEditToken(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashEditToken(token));
  const stored = Buffer.from(storedHash);
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

// ---- 공유 편집 암호(passcode) 발급/해시 -------------------------------------
// 가족 등 여러 사람이 같은 링크에서 함께 편집할 수 있도록, 소유자(editToken 보유자)가
// 정하는 공유 암호입니다. slug를 salt로 섞어 해시하므로 여행마다 다른 해시가 됩니다.
// (editToken과 달리 여러 사람이 같은 값을 알고 있어야 하는 "공유 비밀"이라
//  256bit 무작위값이 아닌, 사람이 정하는 짧은 문자열을 허용합니다.)

export function hashPasscode(passcode: string, slug: string): string {
  return crypto.createHash('sha256').update(`${slug}:${passcode}`).digest('hex');
}

export function verifyPasscode(passcode: string, slug: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const candidate = Buffer.from(hashPasscode(passcode, slug));
  const stored = Buffer.from(storedHash);
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}
