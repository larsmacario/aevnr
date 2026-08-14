alter table public.health_facts
  add column action_title text null check (char_length(action_title) between 4 and 100),
  add column action_body text null check (char_length(action_body) between 20 and 500),
  add column app_action text null check (app_action in ('checkin', 'breathing', 'express', 'protein', 'water', 'ai_plan'));

comment on column public.health_facts.action_title is 'Kurze, quellengebundene Präventionshandlung zum Fakt.';
comment on column public.health_facts.action_body is 'Vorsichtige, alltagstaugliche Umsetzung ohne Diagnose oder Therapie.';
comment on column public.health_facts.app_action is 'Optionaler, begrenzter Navigationshinweis in der App.';
