alter table public.health_facts
  add column language text not null default 'de'
  check (language in ('de', 'en'));

alter table public.user_daily_facts
  add column language text not null default 'de'
  check (language in ('de', 'en'));

alter table public.user_daily_facts
  drop constraint if exists user_daily_facts_user_id_local_date_key;

alter table public.user_daily_facts
  add constraint user_daily_facts_user_date_language_key
  unique (user_id, local_date, language);

drop index if exists public.health_facts_available_idx;
create index health_facts_available_idx
  on public.health_facts (language, topic, published_at desc)
  where status = 'published';

drop index if exists public.user_daily_facts_user_date_idx;
create index user_daily_facts_user_date_idx
  on public.user_daily_facts (user_id, language, local_date desc);

create or replace function public.prevent_daily_fact_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.fact_id is distinct from old.fact_id
    or new.local_date is distinct from old.local_date
    or new.language is distinct from old.language
    or new.timezone is distinct from old.timezone
    or new.assigned_at is distinct from old.assigned_at then
    raise exception 'Only saved_at may be updated on a daily fact assignment';
  end if;
  return new;
end;
$$;

comment on column public.health_facts.language is
  'Display language of the fact content: de or en.';
comment on column public.user_daily_facts.language is
  'Language requested when this daily fact was assigned.';
