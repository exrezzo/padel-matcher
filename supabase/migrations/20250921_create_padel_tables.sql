-- Create required extension for UUID generation (available by default on Supabase, safe to run)
create extension if not exists pgcrypto;

-- Matches table
create table if not exists public.padel_matches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

comment on table public.padel_matches is 'Padel matches';
comment on column public.padel_matches.id is 'Primary key (UUID)';
comment on column public.padel_matches.name is 'Match name/title';
comment on column public.padel_matches.status is 'Arbitrary status label (e.g., pending, scheduled, completed)';
comment on column public.padel_matches.created_at is 'Creation timestamp';

-- Participants association table
create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.padel_matches(id) on delete cascade,
  name text not null,
  status text not null default 'invited',
  created_at timestamptz not null default now()
);

comment on table public.match_participants is 'People associated to a specific padel match';
comment on column public.match_participants.match_id is 'FK to padel_matches.id';
comment on column public.match_participants.name is 'Participant display name';
comment on column public.match_participants.status is 'Participation status (e.g., invited, confirmed, declined)';

-- Helpful index for lookups by match
create index if not exists match_participants_match_id_idx on public.match_participants(match_id);

-- Optional: prevent exact duplicate participant names per match (drop if not desired)
create unique index if not exists match_participants_unique_name_per_match
  on public.match_participants(match_id, name);

