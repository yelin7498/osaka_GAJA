-- =============================================================================
-- 가족여행 플래너 - Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- =============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid() 사용을 위해 필요

create table if not exists public.trips (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null default '',
  trip_data        jsonb not null,          -- TripData 전체(JSON) 저장
  edit_token_hash  text not null,           -- editToken 원문의 SHA-256 해시. 원문은 절대 저장하지 않음
  edit_passcode_hash text,                 -- 공유 편집 암호(passcode)의 SHA-256(slug 솔트) 해시. 미설정 시 null
  is_public        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists trips_slug_idx on public.trips (slug);

-- 이미 배포된 기존 테이블에 새 컬럼만 추가해야 한다면 아래 한 줄만 실행하면 됩니다:
-- alter table public.trips add column if not exists edit_passcode_hash text;

-- updated_at 자동 갱신 트리거 (API 코드에서도 갱신하지만, 다른 경로로 수정되는 경우까지 대비)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- 설계 방침:
--  - "조회"는 공개(is_public = true)인 일정에 한해 익명 사용자도 허용합니다.
--  - "생성/수정/삭제"는 브라우저(anon key)로는 절대 허용하지 않습니다.
--    editToken 검증은 반드시 서버(Next.js API Route)에서 수행하고,
--    서버는 SUPABASE_SERVICE_ROLE_KEY를 사용해 RLS를 우회하여 안전하게 씁니다.
--    (RLS만으로는 "이 토큰 원문이 이 해시와 일치하는가"라는 검증을 표현할 수 없기 때문에,
--     이 구조가 클라이언트에서 SQL 정책만으로 안전하게 처리하려는 시도보다 안전합니다.)
-- =============================================================================

alter table public.trips enable row level security;

drop policy if exists "public trips are readable" on public.trips;
create policy "public trips are readable"
  on public.trips
  for select
  using (is_public = true);

-- insert / update / delete 정책을 의도적으로 만들지 않습니다.
-- anon / authenticated 역할에는 쓰기 정책이 전혀 없으므로 RLS가 기본적으로 모든 쓰기를 차단합니다.
-- service_role 은 RLS 자체를 우회하므로 서버(API Route)의 쓰기는 정상 동작합니다.

-- =============================================================================
-- (참고) Supabase Auth 연동 시 확장 방법
-- =============================================================================
-- 나중에 회원가입/로그인을 붙이게 되면:
--   1) trips 테이블에 owner_id uuid references auth.users(id) 컬럼을 추가
--   2) 생성 시 owner_id = auth.uid() 로 저장
--   3) update/delete 정책을 아래처럼 추가하면 editToken 없이도 로그인 사용자가 자신의
--      일정을 직접 수정할 수 있습니다.
--
-- create policy "owners can update their trips"
--   on public.trips for update
--   using (auth.uid() = owner_id);
--
-- 이 경우에도 editToken 방식과 병행 가능하도록 src/lib/auth/editToken.ts 에 권한 확인
-- 로직을 모아두었습니다.
