-- Preserve the meaning of existing 1–5 ratings when moving to a 1–10 scale.
update public.daily_checkins
set sleep_quality = sleep_quality * 2,
    energy_level = energy_level * 2;

alter table public.daily_checkins
  drop constraint if exists daily_checkins_sleep_quality_check,
  drop constraint if exists daily_checkins_energy_level_check;

alter table public.daily_checkins
  add constraint daily_checkins_sleep_quality_check check (sleep_quality between 1 and 10),
  add constraint daily_checkins_energy_level_check check (energy_level between 1 and 10);
