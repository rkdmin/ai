-- Phase 3 Supabase schema.
-- Apply in Supabase SQL Editor after enabling Auth providers.

create extension if not exists "pgcrypto";

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  face_type text not null,
  face_ratios jsonb,
  personal_color text,
  features text[] default '{}',
  front_image_url text,
  created_at timestamptz default now(),
  photo_expires_at timestamptz
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  card_type text not null check (card_type in ('hair', 'makeup', 'total')),
  card_data jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  card_id uuid references public.cards(id) on delete cascade,
  type text not null,
  detail text,
  created_at timestamptz default now()
);

create table if not exists public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  analyze_count int default 0,
  cards_count int default 0,
  photo_count int default 0,
  primary key (user_id, date)
);

create table if not exists public.generated_photos (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  card_type text not null check (card_type in ('hair', 'total')),
  storage_url text not null,
  created_at timestamptz default now(),
  expires_at timestamptz,
  unique (analysis_id, card_type)
);

alter table public.analyses enable row level security;
alter table public.cards enable row level security;
alter table public.feedback enable row level security;
alter table public.usage_counters enable row level security;
alter table public.generated_photos enable row level security;

create policy "own analyses" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own cards" on public.cards
  for all using (
    exists (
      select 1 from public.analyses a
      where a.id = cards.analysis_id and a.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a
      where a.id = cards.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "own feedback" on public.feedback
  for all using (
    exists (
      select 1 from public.analyses a
      where a.id = feedback.analysis_id and a.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a
      where a.id = feedback.analysis_id and a.user_id = auth.uid()
    )
  );

create policy "own usage counters" on public.usage_counters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own generated photos" on public.generated_photos
  for all using (
    exists (
      select 1 from public.analyses a
      where a.id = generated_photos.analysis_id and a.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a
      where a.id = generated_photos.analysis_id and a.user_id = auth.uid()
    )
  );

create index if not exists analyses_user_created_idx on public.analyses(user_id, created_at desc);
create index if not exists cards_analysis_idx on public.cards(analysis_id);
create index if not exists generated_photos_analysis_idx on public.generated_photos(analysis_id);
