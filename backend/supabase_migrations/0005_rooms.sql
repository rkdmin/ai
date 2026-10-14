-- 0005 — Beauty Room · 친구 참여 · 초대/인계 token (plan 0009 P6 · F08·F09, ADR 0010 R07 추천안).
--
-- 공개 조회(초대 링크로 보는 방장 요약·순위)는 RLS 를 열지 않는다. 백엔드가 service role 로 읽어
-- 공개 DTO(닉네임·대표 무드·Traits·조합 요약)만 돌려준다. 원본 사진·이메일·전체 이력은 어디에도 싣지 않는다.
-- 참여자의 participant_id 는 로그인했으면 auth.users, 웹 게스트면 null + client_key 로 중복 참여를 막는다.
-- (R02 가 "서버 게스트 principal" 로 확정되면 client_key 자리에 그 id 가 들어간다. 컬럼 모양은 같다.)

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_nickname text not null default '나',
  owner_snapshot jsonb not null,               -- 방장의 공개 요약 (chemistry_service.public_profile). 재분석해도 고정 (R17)
  analysis_id uuid references public.analyses(id) on delete set null,
  rule_version int not null,                   -- 케미 계산 규칙 버전 (chemistry.json)
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid references auth.users(id) on delete set null,
  client_key text,                             -- 웹 게스트 중복 참여 방지용 (브라우저가 보관하는 랜덤 키)
  nickname text not null,
  profile_snapshot jsonb not null,             -- 참여 당시 공개 요약. 재분석해도 고정
  chemistry jsonb not null,                    -- chemistry_service.compute 결과 (type·score·summary·ruleVersion)
  joined_at timestamptz default now()
);
create unique index if not exists room_participants_user_key on public.room_participants(room_id, participant_id) where participant_id is not null;
create unique index if not exists room_participants_client_key on public.room_participants(room_id, client_key) where client_key is not null;
create index if not exists room_participants_room_idx on public.room_participants(room_id, joined_at);

create table if not exists public.invite_tokens (
  token text primary key,                      -- 긴 랜덤. URL 에 이것만 싣는다
  room_id uuid not null references public.rooms(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

-- 웹 참여 → 앱 인계 (F09). 참여 직후 발급, 1회 사용, 짧은 만료. URL 에 결과·이메일·세션은 싣지 않는다.
create table if not exists public.handoff_tokens (
  token text primary key,
  participant_id uuid not null references public.room_participants(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.invite_tokens enable row level security;
alter table public.handoff_tokens enable row level security;
create policy "own rooms" on public.rooms
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- room_participants / invite_tokens / handoff_tokens: 정책 없음 = 클라이언트 직접 접근 불가, 백엔드(service role)만
create index if not exists rooms_owner_active_idx on public.rooms(owner_id) where active;
