-- 0006 — 저장한 스타일 (plan 0009 P5 · F10). 초안 supabase_schema_v10_draft.sql 의 bookmarks 를 그대로 옮겼다.
-- 저장 대상은 운영 콘텐츠(backend/data/styles/content.json 의 id) 뿐이다. 리포트 안 추천 저장은 R10 결정 뒤.

create table if not exists public.bookmarks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  content_kind text not null check (content_kind in ('makeup', 'hair', 'mood')),   -- MY 필터용
  created_at timestamptz default now(),
  primary key (owner_id, content_id)                                                -- 중복 저장 불가, 게스트 병합은 upsert
);

alter table public.bookmarks enable row level security;
create policy "own bookmarks" on public.bookmarks
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
