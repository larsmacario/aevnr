create type public.health_fact_topic as enum (
  'gut_health', 'nutrition', 'sleep', 'movement',
  'cardiovascular', 'mental_health', 'metabolism', 'healthy_aging'
);

create table public.health_facts (
  id uuid primary key default gen_random_uuid(),
  topic public.health_fact_topic not null,
  title text not null check (char_length(title) between 8 and 120),
  body text not null check (char_length(body) between 40 and 1200),
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  content_hash text not null unique,
  generated_at timestamptz not null default now(),
  published_at timestamptz null
);

create index health_facts_available_idx
  on public.health_facts (topic, published_at desc)
  where status = 'published';

create table public.health_fact_sources (
  id uuid primary key default gen_random_uuid(),
  fact_id uuid not null references public.health_facts (id) on delete cascade,
  pmid text not null check (pmid ~ '^[0-9]{1,12}$'),
  title text not null,
  authors text not null,
  journal text not null,
  publication_year smallint not null check (publication_year between 1900 and 2100),
  publication_type text null,
  pubmed_url text not null check (pubmed_url like 'https://pubmed.ncbi.nlm.nih.gov/%'),
  created_at timestamptz not null default now(),
  unique (fact_id, pmid)
);

create table public.user_daily_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fact_id uuid not null references public.health_facts (id) on delete restrict,
  local_date date not null,
  timezone text not null check (char_length(timezone) between 1 and 64),
  assigned_at timestamptz not null default now(),
  saved_at timestamptz null,
  unique (user_id, local_date),
  unique (user_id, fact_id)
);

create index user_daily_facts_user_date_idx
  on public.user_daily_facts (user_id, local_date desc);

alter table public.health_facts enable row level security;
alter table public.health_fact_sources enable row level security;
alter table public.user_daily_facts enable row level security;

revoke all on public.health_facts, public.health_fact_sources, public.user_daily_facts from anon, authenticated;

-- App reads are served through the authenticated Edge Function. These policies keep
-- direct Data API access limited to a user's own assignments and their sources.
grant select on public.health_facts, public.health_fact_sources, public.user_daily_facts to authenticated;
grant update (saved_at) on public.user_daily_facts to authenticated;

create policy "health_facts_select_assigned"
  on public.health_facts for select to authenticated
  using (
    exists (
      select 1 from public.user_daily_facts assignment
      where assignment.fact_id = health_facts.id
        and assignment.user_id = (select auth.uid())
    )
  );

create policy "health_fact_sources_select_assigned"
  on public.health_fact_sources for select to authenticated
  using (
    exists (
      select 1 from public.user_daily_facts assignment
      where assignment.fact_id = health_fact_sources.fact_id
        and assignment.user_id = (select auth.uid())
    )
  );

create policy "user_daily_facts_select_own"
  on public.user_daily_facts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_daily_facts_update_saved_own"
  on public.user_daily_facts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.prevent_daily_fact_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.fact_id is distinct from old.fact_id
    or new.local_date is distinct from old.local_date
    or new.timezone is distinct from old.timezone
    or new.assigned_at is distinct from old.assigned_at then
    raise exception 'Only saved_at may be updated on a daily fact assignment';
  end if;
  return new;
end;
$$;

create trigger user_daily_facts_prevent_reassignment
  before update on public.user_daily_facts
  for each row execute function public.prevent_daily_fact_reassignment();

-- Cron jobs are intentionally installed only after the deployment process has put
-- `supabase_url`, `supabase_publishable_key` and `facts_cron_secret` into Vault.
-- The Edge Functions reject every request without that secret.
create extension if not exists pg_cron;
create extension if not exists pg_net;
