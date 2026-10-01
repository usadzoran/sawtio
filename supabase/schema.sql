-- Sawtio rooms schema
-- Run this script once in Supabase Dashboard → SQL Editor.
-- The anon key can read and create rooms through the policies below.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text not null default 'مجتمع',
  category text not null default 'الأكثر نشاطًا',
  listeners integer not null default 1 check (listeners >= 0),
  status text not null default 'مباشر الآن',
  accent text not null default 'coral' check (accent in ('coral', 'teal', 'violet', 'amber')),
  host text not null,
  host_initials text not null,
  host_tone text not null default 'tone-coral',
  private boolean not null default false,
  members jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

grant select, insert on table public.rooms to anon;

drop policy if exists "public can read rooms" on public.rooms;
create policy "public can read rooms"
  on public.rooms for select
  to anon
  using (true);

drop policy if exists "public can create rooms" on public.rooms;
create policy "public can create rooms"
  on public.rooms for insert
  to anon
  with check (true);

create index if not exists rooms_created_at_idx on public.rooms (created_at desc);
