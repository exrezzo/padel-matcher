-- Add a free-form notes field to padel_matches and allow anon to update it

alter table if exists public.padel_matches
  add column if not exists notes text not null default '';

-- Ensure RLS is enabled (idempotent)
alter table if exists public.padel_matches enable row level security;

-- Allow anon to update padel_matches (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'padel_matches'
      and p.policyname = 'allow_anon_update_padel_matches'
  ) then
    execute 'create policy "allow_anon_update_padel_matches" on public.padel_matches
      for update to anon
      using (true)
      with check (true)';
  end if;
end $$;

