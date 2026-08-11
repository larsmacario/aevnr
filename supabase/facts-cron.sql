-- Einmal nach Migration und Function-Deploy im Supabase SQL Editor ausführen.
-- Ersetze die drei Platzhalter vor dem Ausführen durch sichere, reale Werte.
select vault.create_secret('https://PROJECT_REF.supabase.co', 'supabase_url');
select vault.create_secret('SUPABASE_PUBLISHABLE_KEY', 'supabase_publishable_key');
select vault.create_secret('LONG_RANDOM_SECRET', 'facts_cron_secret');

select cron.unschedule(jobid)
from cron.job
where jobname in ('assign-daily-facts', 'replenish-fact-library');

select cron.schedule(
  'assign-daily-facts',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/assign-daily-facts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_publishable_key'),
        'x-facts-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'facts_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $job$
);

select cron.schedule(
  'replenish-fact-library',
  '5 0 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/generate-fact-library',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_publishable_key'),
        'x-facts-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'facts_cron_secret')
      ),
      body := '{"limitPerTopic": 3}'::jsonb
    );
  $job$
);
