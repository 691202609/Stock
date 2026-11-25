create table if not exists public.user_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 500000)
);
alter table public.user_state enable row level security;
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;
drop policy if exists own_state on public.user_state;
create policy own_state on public.user_state for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
