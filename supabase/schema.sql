create table if not exists public.user_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 500000)
);
alter table public.user_state enable row level security;
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;
drop policy if exists own_state on public.user_state;
create policy own_state on public.user_state for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- V6.4: rolling 24h quota per authenticated account, shared across Vercel instances.
-- No direct table access from client. Each attempted upstream call consumes one slot.
create table if not exists public.market_request_log (
 user_id uuid not null references auth.users(id) on delete cascade,
 requested_at timestamptz not null default clock_timestamp()
);
create index if not exists market_request_log_user_time on public.market_request_log(user_id, requested_at);
alter table public.market_request_log enable row level security;
revoke all on public.market_request_log from public, anon, authenticated;
create or replace function public.reserve_market_request() returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t timestamptz; n integer; latest timestamptz;
begin
 if uid is null then return false; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 0));
 t := clock_timestamp();
 delete from public.market_request_log where user_id=uid and requested_at <= t - interval '24 hours';
 select count(*), max(requested_at) into n, latest from public.market_request_log where user_id=uid;
 if n >= 25 or (latest is not null and latest > t - interval '16 seconds') then return false; end if;
 insert into public.market_request_log(user_id,requested_at) values(uid,t);
 return true;
end; $$;
revoke all on function public.reserve_market_request() from public, anon;
grant execute on function public.reserve_market_request() to authenticated;
