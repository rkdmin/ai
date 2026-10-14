-- ⚠️ DRAFT — 아직 적용하지 않는다.
--
-- plan 0009 D04 의 v1.0 신규 테이블 설계 초안. 리포트·구매·북마크·Room 이 각각
-- P3 / P4 / P5 / P6 에서 구현될 때 이 초안을 supabase_migrations/000N 으로 옮겨 적용한다.
-- 그 전까지는 "이런 모양으로 간다"는 합의 문서다. 실제 컬럼은 각 단계의 POC 결과로 바뀔 수 있다.
--
-- 소유자 컬럼(owner_id)에 대하여 — R02 미결 (ADR 0010):
--   · R02 = "결제 전 로그인 필수" 로 확정되면 owner_id 는 auth.users(id) 그대로다.
--   · R02 = "서버 게스트 principal" 로 확정되면 Supabase 익명 세션의 auth.users(id) 를 그대로 쓰고,
--     계정 연결 시 익명 user → 실제 user 로 행의 owner_id 를 옮기는 claim 절차가 추가된다.
--   어느 쪽이든 owner_id 의 타입과 FK 는 같다. 바뀌는 것은 "누가 그 id 를 받느냐"와 claim 유무다.
--   그래서 여기서는 auth.users(id) 로 두고 RLS 는 auth.uid() = owner_id 로 통일한다.
--
-- 결제 세부 컬럼(purchases.store_payload 등)은 P4 의 Play Billing POC 로 구글이 실제로 주는 토큰·
-- pending·환불 알림 모양을 본 뒤 확정한다. 지금 모양은 "거래 토큰 + 소유자 + 리포트" 의 최소 연결이다.

-- ── 리포트 (P3 · F04) — ✅ supabase_migrations/0003_reports.sql 로 옮겨 적용 대상이 됐다. 아래는 참고용 사본 ──
-- 리포트는 구매 시점의 분석 snapshot 에 고정된다 (ADR 0010 R01). 재분석해도 바뀌지 않는다.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete restrict,  -- 리포트가 붙은 분석은 지우지 않는다
  analysis_snapshot jsonb not null,            -- 구매 당시 analyses.result 복사본 (분석 행이 바뀌어도 리포트는 고정)
  schema_version int not null,                 -- snapshot 의 모양 버전
  status text not null default 'not_started'
    check (status in ('not_started', 'generating', 'ready', 'partial_failed', 'failed')),
  hair jsonb,                                  -- Hair 탭 본문. 구매 전엔 null (전체 본문을 payload 에 싣지 않는다)
  makeup jsonb,                                -- Makeup 탭 본문
  hair_error text,
  makeup_error text,                           -- 부분 실패 재시도용
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 구매·권한 (P4 · F05) ───────────────────────────────────────────
-- 거래(purchases)와 권한(entitlements)을 분리한다. 환불·회수는 권한만 끊고 거래 기록은 남긴다.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('play')),          -- iOS 는 ADR 0008 이후
  product_id text not null,                                      -- 스토어 상품 ID (가격은 저장하지 않는다 — R03)
  purchase_token text not null unique,                           -- 같은 거래 token 은 한 번만 등록
  order_id text,
  state text not null default 'pending'
    check (state in ('pending', 'verified', 'acknowledged', 'refunded', 'revoked', 'error')),
  store_payload jsonb,                                           -- 구글 검증 응답 원문. 모양은 P4 POC 후 확정
  verified_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,  -- 복원 = purchase → entitlement → report 를 따라간다
  active boolean not null default true,
  revoked_reason text,
  created_at timestamptz default now(),
  revoked_at timestamptz
);

-- ── 북마크 (P5 · F10) — ✅ supabase_migrations/0006_bookmarks.sql 로 옮겨 적용 대상이 됐다 (kind 에 mood 추가). 아래는 참고용 사본 ──
-- 저장 대상은 운영 콘텐츠(STYLE 에디토리얼)만. content_id 는 콘텐츠 사전(D05)의 안정적 ID.
create table if not exists public.bookmarks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  content_kind text not null check (content_kind in ('makeup', 'hair')),   -- MY 필터용
  created_at timestamptz default now(),
  primary key (owner_id, content_id)                                        -- 중복 저장 불가, 게스트 병합 시 upsert
);

-- ── Room·참여·초대 (P6 · F08·F09) — ✅ supabase_migrations/0005_rooms.sql 로 옮겨 적용 대상이 됐다 (client_key·owner_nickname 추가). 아래는 참고용 사본 ──
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_snapshot jsonb not null,               -- 방장의 공개 요약(닉네임·Primary·Traits). 원본 사진·이메일 없음
  rule_version int not null,                   -- 케미 계산 규칙 버전 (D08)
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid references auth.users(id) on delete set null,  -- 웹 참여자는 null 일 수 있다 (R02 와 함께 확정)
  nickname text not null,
  profile_snapshot jsonb not null,             -- 참여 당시 공개 요약. 재분석해도 고정 (R17 추천안)
  chemistry jsonb not null,                    -- {type, score, summary} — 재현 가능한 규칙 계산 결과
  created_at timestamptz default now(),
  unique (room_id, participant_id)             -- 같은 친구 중복 참여 방지
);

create table if not exists public.invite_tokens (
  token text primary key,                      -- 긴 랜덤. URL 에 이것만 싣는다
  room_id uuid not null references public.rooms(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

-- 앱 인계용 일회성 token (F09). 웹 참여 맥락을 앱이 넘겨받을 때만 쓰고 1회 사용 후 소모.
create table if not exists public.handoff_tokens (
  token text primary key,
  participant_id uuid not null references public.room_participants(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

-- ── RLS (초안) ──────────────────────────────────────────────────────
-- 소유자 행은 auth.uid() = owner_id. 공개 조회(초대 링크로 보는 방장 요약·순위)는 RLS 를 열지 않고
-- 백엔드가 service role 로 읽어 공개 DTO 만 돌려준다 — 링크 token 이 곧 권한이라 RLS 식으로 표현되지 않는다.
alter table public.reports enable row level security;
alter table public.purchases enable row level security;
alter table public.entitlements enable row level security;
alter table public.bookmarks enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.invite_tokens enable row level security;
alter table public.handoff_tokens enable row level security;

create policy "own reports" on public.reports
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "own purchases" on public.purchases
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "own entitlements" on public.entitlements
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "own bookmarks" on public.bookmarks
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "own rooms" on public.rooms
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- room_participants / invite_tokens / handoff_tokens 는 service role 전용 (정책 없음 = 클라이언트 직접 접근 불가)

create index if not exists reports_owner_idx on public.reports(owner_id, created_at desc);
create index if not exists purchases_owner_idx on public.purchases(owner_id);
create index if not exists entitlements_owner_idx on public.entitlements(owner_id) where active;
create index if not exists rooms_owner_active_idx on public.rooms(owner_id) where active;
create index if not exists room_participants_room_idx on public.room_participants(room_id);
