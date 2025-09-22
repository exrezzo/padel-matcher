-- Add a 'notes' column to match_participants and allow anon to update participants

alter table if exists public.match_participants
  add column if not exists notes text not null default '';

-- Ensure RLS is enabled (idempotent)
alter table if exists public.match_participants enable row level security;

-- Create an update policy for anon to edit participant rows (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'match_participants'
      and p.policyname = 'allow_anon_update_match_participants'
  ) then
    execute 'create policy "allow_anon_update_match_participants" on public.match_participants
      for update to anon
      using (true)
      with check (true)';
  end if;
end $$;
