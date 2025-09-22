-- Enable RLS and create permissive policies so anon can read matches and read/insert participants.
-- This fixes 401s in production when using the anon key from Edge Functions.

-- Enable RLS (idempotent: enabling twice is harmless)
alter table if exists public.padel_matches enable row level security;
alter table if exists public.match_participants enable row level security;

-- Helper to create a policy if it does not already exist
create or replace function public.__create_policy_if_absent(
  p_policy_name text,
  p_table regclass,
  p_cmd text,
  p_role name,
  p_using text,
  p_check text default null
) returns void language plpgsql as $$
declare
  cmd_lower text := lower(p_cmd);
  using_expr text := null;
  check_expr text := null;
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = split_part(p_table::text, '.', 1)
      and tablename = split_part(p_table::text, '.', 2)
      and policyname = p_policy_name
  ) then
    -- USING is valid for SELECT/UPDATE/DELETE; not for INSERT
    if cmd_lower in ('select','update','delete') then
      using_expr := coalesce(p_using, 'true');
    end if;
    -- WITH CHECK is valid for INSERT/UPDATE
    if cmd_lower in ('insert','update') then
      check_expr := coalesce(p_check, 'true');
    end if;

    execute format(
      'create policy %I on %s for %s to %I%s%s',
      p_policy_name,
      p_table::text,
      cmd_lower,
      p_role,
      case when using_expr is not null then format(' using (%s)', using_expr) else '' end,
      case when check_expr is not null then format(' with check (%s)', check_expr) else '' end
    );
  end if;
end;
$$;

-- Allow anon to read matches
select public.__create_policy_if_absent(
  'allow_anon_select_padel_matches', 'public.padel_matches', 'select', 'anon', 'true', null
);

-- Allow anon to read participants
select public.__create_policy_if_absent(
  'allow_anon_select_match_participants', 'public.match_participants', 'select', 'anon', 'true', null
);

-- Allow anon to insert participants
select public.__create_policy_if_absent(
  'allow_anon_insert_match_participants', 'public.match_participants', 'insert', 'anon', 'true', 'true'
);

-- Optionally allow anon to create matches (keep if you rely on anon in create-match)
select public.__create_policy_if_absent(
  'allow_anon_insert_padel_matches', 'public.padel_matches', 'insert', 'anon', 'true', 'true'
);

-- Cleanup helper (safe to keep; comment out if you want to retain for future migrations)
drop function if exists public.__create_policy_if_absent(text, regclass, text, name, text, text);
