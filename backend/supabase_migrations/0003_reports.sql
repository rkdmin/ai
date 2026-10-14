-- 0003 — 통합 Beauty Report (plan 0009 P3 · F04, ADR 0010 R01).
--
-- 리포트는 구매 시점의 분석 snapshot 에 고정된다. 재분석해도 바뀌지 않는다.
-- supabase_schema_v10_draft.sql 의 reports 초안을 그대로 옮겼다. 구매·권한(purchases/entitlements)은 P4 에서.
-- 그 전까지 접근 제어는 백엔드 REPORT_ACCESS_MODE 로 한다 (report_service.py 참조).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete restrict,  -- 리포트가 붙은 분석은 지우지 않는다
  analysis_snapshot jsonb not null,            -- 구매 당시 분석 (analysis_from_row 출력). 분석 행이 바뀌어도 리포트는 고정
  schema_version int not null,                 -- snapshot 의 모양 버전
  status text not null default 'not_started'
    check (status in ('not_started', 'generating', 'ready', 'partial_failed', 'failed')),
  hair jsonb,                                  -- Hair 탭 본문 (카드 배열). 권한 없으면 API 가 내려주지 않는다
  makeup jsonb,                                -- Makeup 탭 본문
  hair_error text,
  makeup_error text,                           -- 부분 실패 재시도용
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (owner_id, analysis_id)               -- 같은 분석으로 리포트 둘을 만들지 않는다 (R01)
);

alter table public.reports enable row level security;
create policy "own reports" on public.reports
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create index if not exists reports_owner_idx on public.reports(owner_id, created_at desc);

-- analyses 삭제 시 reports 가 restrict 로 막는다. 계정 삭제(DELETE /api/account)는 reports 를 먼저 지운다.
