drop policy if exists admin_select_all_clubs on public.clubs;

create policy admin_select_all_clubs
on public.clubs
for select
to authenticated
using ( get_current_user_role() = 'ADMIN' );