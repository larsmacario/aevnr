-- Daily, non-medical readiness signals for the Healthspan dashboard.
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_date date not null default current_date,
  sleep_hours numeric(3, 1) not null check (sleep_hours >= 0 and sleep_hours <= 24),
  sleep_quality smallint not null check (sleep_quality between 1 and 5),
  stress_level smallint not null check (stress_level between 1 and 10),
  energy_level smallint not null check (energy_level between 1 and 5),
  note text null check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create index if not exists daily_checkins_user_date_idx
  on public.daily_checkins (user_id, checkin_date desc);

alter table public.daily_checkins enable row level security;
revoke all on table public.daily_checkins from anon;
revoke all on table public.daily_checkins from authenticated;
grant select, insert, update, delete on table public.daily_checkins to authenticated;

create policy "daily_checkins_select_own"
  on public.daily_checkins for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "daily_checkins_insert_own"
  on public.daily_checkins for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "daily_checkins_update_own"
  on public.daily_checkins for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "daily_checkins_delete_own"
  on public.daily_checkins for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Body photos contain sensitive health-related images and must not be served publicly.
update storage.buckets set public = false where id = 'body-photos';
