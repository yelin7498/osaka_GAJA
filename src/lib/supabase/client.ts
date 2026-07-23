import { createClient } from '@supabase/supabase-js';

// 브라우저(클라이언트) 전용 Supabase 클라이언트. anon key만 사용하며,
// 이 프로젝트에서는 실제 읽기/쓰기는 모두 Next.js API Route(/api/trips/**)를
// 통해 이루어집니다. 이 클라이언트는 추후 Supabase Auth(예: 소셜 로그인)를
// 붙일 때를 대비해 분리해 두었습니다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser =
  url && anonKey
    ? createClient(url, anonKey)
    : null; // 환경변수가 없는 로컬 미리보기에서도 앱이 죽지 않도록 null 허용
