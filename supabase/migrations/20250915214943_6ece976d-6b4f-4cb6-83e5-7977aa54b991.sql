-- 1) Inspect current grants (so we can see the before/after)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'club_banking'
order by grantee, privilege_type;

-- 2) Grant required privileges to the 'authenticated' role.
-- RLS will still control WHICH rows they can access.
grant select, insert, update on table public.club_banking to authenticated;

-- (Optional) If you ever add a sequence/serial on this table, also grant sequence usage:
-- grant usage, select on all sequences in schema public to authenticated;