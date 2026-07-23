# 가족여행 일정 플래너 (편집 + 저장 + 공유)

첨부해주신 `오사카·간사이 가족여행 플래너` HTML의 디자인(와시지 배경, 티켓형 헤더, 점선 구분선,
날짜별 일정 카드 등)을 그대로 살리면서, 브라우저 안에서 일정을 편집·저장·공유할 수 있는
Next.js 웹서비스로 다시 만들었습니다.

## 1. 기술 스택 및 선택 이유

원본 HTML은 여러 탭(개요/예산/지출/코디/체크리스트 등)을 가진 개인용 단일 페이지였습니다.
이번 요청의 핵심은 "여러 사람이 링크로 접속해 편집·조회하는 서비스"이므로, 서버에 데이터를
저장하고 편집 권한을 검증하는 로직이 반드시 필요합니다. 이 부분은 순수 HTML/JS만으로는
안전하게 구현할 수 없어(민감한 토큰 검증, DB 접근 등은 반드시 서버 코드가 필요) 아래 스택으로
전환했습니다.

- **Next.js 16 (App Router, 최신 안정 버전) + TypeScript** — 페이지와 API를 한 프로젝트에서 관리, Vercel 배포 용이
- **Tailwind CSS** — 레이아웃 유틸리티용. 원본 고유 디자인(색상/카드/티켓 느낌)은 `globals.css`에 원본 CSS를 그대로 이식해 유지했습니다.
- **Supabase (Postgres + RLS)** — 일정 데이터 저장
- **dnd-kit** — 일정 항목 드래그 앤 드롭 순서 변경
- **xlsx (SheetJS)** — 엑셀/CSV 일정 가져오기

이번 구현 범위는 사용자께서 요청하신 JSON 데이터 구조(제목/기간/인원/숙소/날짜별 일정)에
집중했습니다. 원본 HTML에 있던 예산/지출/코디/체크리스트/준비물 탭은 이번 데이터 구조에
포함되어 있지 않아 이번 버전에는 넣지 않았습니다 (마지막 "변경 가능한 부분" 참고).

## 2. 프로젝트 구조

```
trip-planner/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                     # 메인: 새 일정 만들기 / 기존 일정 불러오기
│  │  ├─ globals.css                  # 원본 디자인을 이식한 전역 스타일 + 인쇄 CSS
│  │  ├─ trip/[slug]/page.tsx         # 편집/보기 페이지 (서버에서 초기 데이터 조회)
│  │  ├─ trip/[slug]/loading.tsx      # 로딩 화면
│  │  ├─ trip/[slug]/not-found.tsx    # 존재하지 않는 일정 화면
│  │  └─ api/trips/...                # 생성/조회/수정/삭제/토큰검증 API
│  ├─ components/
│  │  ├─ TripEditor.tsx               # 편집/보기 모드, 자동저장, 공유, 인쇄 등 핵심 로직
│  │  ├─ DayCard.tsx                  # 날짜별 섹션 + 드래그앤드롭 컨텍스트
│  │  ├─ ItemRow.tsx                  # 일정 항목 (보기/편집 뷰 분리)
│  │  ├─ ExcelImportModal.tsx         # 엑셀/CSV 가져오기 + 컬럼 매핑 UI
│  │  ├─ SaveStatus.tsx / Toast.tsx   # 저장 상태 및 토스트 알림
│  ├─ lib/
│  │  ├─ types.ts                     # TripData/TripDay/ItineraryItem 타입
│  │  ├─ slug.ts                      # slug 생성
│  │  ├─ excelImport.ts               # 엑셀 파싱/매핑 로직
│  │  ├─ auth/editToken.ts            # editToken localStorage 저장/조회 (클라이언트)
│  │  └─ supabase/{client,server}.ts  # 브라우저용 / 서버(관리자)용 Supabase 클라이언트
├─ supabase/schema.sql                # 테이블 + RLS 정책
├─ .env.local.example
└─ package.json
```

## 3. 데이터 구조

`trips.trip_data` (JSONB)에 아래 구조 그대로 저장됩니다. (`src/lib/types.ts`)

```jsonc
{
  "id": "trip-xxxxxxxx",
  "slug": "osaka-family-trip-a1b2",
  "title": "오사카·간사이 가족여행",
  "startDate": "2026-08-13",
  "endDate": "2026-08-18",
  "travelers": 4,
  "hotel": "",
  "description": "",
  "days": [
    {
      "id": "day-xxxxxxxx",
      "date": "2026-08-13",
      "title": "Day 1 (도착)",
      "items": [
        {
          "id": "item-xxxxxxxx",
          "startTime": "09:10",
          "endTime": "09:50",
          "title": "CURU-F 기념품 쇼핑",
          "location": "후쿠이역",
          "transport": "도보",
          "description": "",
          "memo": "",
          "order": 1
        }
      ]
    }
  ],
  "createdAt": "2026-07-22T00:00:00.000Z",
  "updatedAt": "2026-07-22T00:00:00.000Z"
}
```

## 4. 편집 권한 (editToken) 동작 방식

1. "여행 일정 만들기"를 누르면 `POST /api/trips`가 실행되고, 서버가 256bit 무작위
   `editToken`을 생성해 **이번 응답에서 딱 한 번만** 돌려줍니다.
2. 브라우저는 이 토큰을 `localStorage`에 `trip_edit_token_{slug}` 키로 저장합니다.
   URL이나 화면에는 절대 노출되지 않습니다.
3. DB에는 토큰 원문이 아니라 `sha256(token)` 해시값만 저장됩니다 (`edit_token_hash`).
4. 해당 링크를 다시 열면, 브라우저가 저장된 토큰을 `POST /api/trips/[slug]/verify`로
   보내 "편집 가능 여부"만 확인하고, 맞으면 편집 버튼이 활성화됩니다.
5. 실제 저장(`PUT /api/trips/[slug]`)을 할 때도 서버가 **다시 한 번** 토큰을 해시로
   검증합니다. verify 응답 결과는 화면 표시용일 뿐, 실제 쓰기 권한은 항상 서버가
   독립적으로 재확인합니다.
6. 다른 사람이 공유 링크로 들어오면 editToken이 없으므로 자동으로 보기 전용이 됩니다.

DB의 Row Level Security는 `is_public = true`인 글의 SELECT만 허용하고, INSERT/UPDATE/DELETE
정책은 아예 만들지 않았습니다. 즉 브라우저(anon key)로는 어떤 쓰기도 할 수 없고, 모든 쓰기는
서버 API가 `SUPABASE_SERVICE_ROLE_KEY`로 수행합니다 (RLS 우회는 서버에서만, 그리고 토큰 검증
후에만 이루어집니다). "클라이언트 전용으로는 안전한 토큰 검증이 어려우면 서버 API를 쓰라"는
요청을 이렇게 반영했습니다.

**추후 Supabase Auth 연동**: `src/lib/auth/editToken.ts`와 `supabase/schema.sql` 하단 주석에
로그인 사용자용으로 확장하는 방법을 적어두었습니다 (`owner_id` 컬럼 추가 + RLS 정책 추가).

## 5. Supabase 설정

1. https://supabase.com 에서 프로젝트 생성
2. 프로젝트 대시보드 > SQL Editor 에서 `supabase/schema.sql` 전체 내용을 실행
3. Project Settings > API 에서 값 확인:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (절대 공개 저장소나 클라이언트 코드에 넣지 마세요)

## 6. 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채워주세요.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY`는 `src/lib/supabase/server.ts`에서만 사용되며, 이 파일은
`app/api/**`와 서버 컴포넌트(`app/trip/[slug]/page.tsx`)에서만 import됩니다. 클라이언트
번들에는 절대 포함되지 않습니다.

## 7. 로컬 실행 방법

```bash
cd trip-planner
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev
```

브라우저에서 http://localhost:3000 접속.

이 프로젝트는 실제로 `npm install` → `npm run build` → `npm run start`까지 실행해
빌드 오류가 없는 것을 확인했습니다 (Next.js 16.2.11 / React 19 / TypeScript strict 모드).

## 8. Vercel 배포 방법

1. GitHub 저장소에 프로젝트 푸시 (`node_modules`, `.env.local`은 `.gitignore`로 제외됨)
2. https://vercel.com 에서 "Add New Project" → 해당 저장소 선택
3. 프레임워크는 Next.js로 자동 인식됨
4. **Environment Variables**에 아래 3개 추가 (Production/Preview 모두 체크 권장):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy 클릭. 배포 후 `https://<프로젝트>.vercel.app/trip/<slug>` 형태로 접속 가능합니다.

## 9. 실제 테스트 방법

1. **생성**: 메인 페이지에서 여행 제목/기간/인원/숙소 입력 후 "여행 일정 만들기" 클릭
   → `/trip/<slug>`로 이동하고 자동으로 편집 권한이 있는 상태(=이 브라우저가 만든 사람)가 됩니다.
2. **편집**: "편집하기" 클릭 → 날짜 제목/날짜, 각 일정의 시간/장소/이동수단/설명/메모 수정,
   "+ 일정 추가", "+ 날짜 추가", 항목 왼쪽의 ⠿ 손잡이로 드래그해 순서 변경.
3. **자동 저장 확인**: 아무 입력값이나 수정 후 가만히 1초 기다리면 우측 상단에 "저장 중..." →
   "저장 완료"가 표시됩니다. 새로고침해도 방금 수정한 내용이 그대로 남아있으면 정상입니다.
4. **수동 저장**: "저장" 버튼을 눌러도 즉시 저장됩니다.
5. **공유(보기 전용) 확인**: "🔗 공유 링크 복사" 클릭 후, 시크릿창(또는 다른 브라우저)에서
   그 링크를 열어보세요. editToken이 없으므로 "편집하기" 버튼이 보이지 않고 보기 전용으로만
   표시되어야 합니다.
6. **권한 없는 수정 차단 확인**: 시크릿창에서 개발자도구 Network 탭을 열고 직접
   `PUT /api/trips/<slug>`를 (editToken 없이) 호출해보면 401/403 오류가 반환되는지 확인하세요.
7. **인쇄/PDF**: 공유 페이지에서 "🖨️ 인쇄/PDF" 클릭 → 브라우저 인쇄 미리보기에서 편집/공유
   버튼 등 불필요한 UI가 빠지고 날짜 카드가 페이지 중간에서 어색하게 잘리지 않는지 확인합니다.
8. **엑셀 가져오기**: 편집 모드에서 "엑셀 가져오기" → 날짜/시간/일정/장소/이동수단/메모 컬럼이
   있는 .xlsx 또는 .csv 업로드 → 컬럼 연결 확인 → 미리보기 → "일정으로 가져오기".

## 10. 알려진 제한사항 / 앞으로 바뀔 수 있는 부분

- **원본 HTML의 예산·지출·코디·주요여행지·체크리스트·준비물 탭**은 이번에 요청하신 JSON
  데이터 구조에 포함되어 있지 않아 구현하지 않았습니다. 필요하시면 `TripData`에 해당 필드를
  추가하고 탭 UI를 이식하는 방식으로 확장할 수 있습니다.
- **slug 생성**: 한글 제목은 그대로 로마자 변환이 어려워, "영문 별명(선택 입력) + 랜덤 코드"
  조합으로 만듭니다. 별명을 입력하지 않으면 `trip-xxxxxxxx` 형태가 됩니다.
- **editToken 해시**: 토큰 자체가 256bit 무작위 값이라 별도 salt 없이 SHA-256 해시만
  저장해도 안전합니다 (사람이 외우는 비밀번호가 아니므로 bcrypt 등 느린 해시가 필요하지
  않습니다).
- **하나의 브라우저 = 하나의 편집자** 구조입니다. 여러 사람이 동시에 편집하는 협업 기능
  (실시간 동시 편집, 충돌 해결)은 포함되어 있지 않습니다. 마지막에 저장한 내용이 반영됩니다.
- **일정 순서 변경(드래그)** 은 같은 날짜 섹션 안에서만 가능합니다. 날짜를 넘나드는 항목
  이동은 항목을 삭제 후 다른 날짜에 다시 추가해야 합니다.
- 미리보기(편집 중 실시간 미리보기 패널)는 별도 패널 대신 "보기 모드로" 토글로 구현했습니다.
  분할 화면 미리보기가 필요하면 `TripEditor.tsx`에 두 번째 렌더링 영역을 추가하면 됩니다.
