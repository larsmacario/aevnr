-- Voluntary, non-medical meal context for the Healthspan metabolism module.
create table if not exists public.metabolic_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_quality text not null check (meal_quality in ('balanced', 'carb_focused', 'light')),
  energy_level smallint not null check (energy_level between 1 and 10),
  satiety_level smallint not null check (satiety_level between 1 and 10),
  note text null check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists metabolic_logs_user_logged_at_idx
  on public.metabolic_logs (user_id, logged_at desc);

alter table public.metabolic_logs enable row level security;
revoke all on table public.metabolic_logs from anon;
revoke all on table public.metabolic_logs from authenticated;
grant select, insert, update, delete on table public.metabolic_logs to authenticated;

create policy "metabolic_logs_select_own"
  on public.metabolic_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "metabolic_logs_insert_own"
  on public.metabolic_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "metabolic_logs_update_own"
  on public.metabolic_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "metabolic_logs_delete_own"
  on public.metabolic_logs for delete to authenticated
  using ((select auth.uid()) = user_id);
