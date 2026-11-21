-- Reuse the installed authenticated dispatcher for the diary's current races.
select cron.alter_job(
  jobid,
  schedule := '*/2 * * * *',
  command := $job$
    select vili_internal.dispatch_opava_push()
    where exists (
      select 1 from public.events
      where date between (now() at time zone 'Europe/Bratislava')::date - 1
                     and (now() at time zone 'Europe/Bratislava')::date
    );
  $job$
)
from cron.job
where jobname = 'vili-opava-push-after-update';
