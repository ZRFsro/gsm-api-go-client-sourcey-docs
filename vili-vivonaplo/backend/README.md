# Backend snapshot

`index.ts` is the source for the Supabase Edge Function `vili-vivonaplo`. It uses the existing project tables and environment secrets. `event_live_updates.sql` records the additive migration for venue updates.

The current frontend is `../index.html`, served by GitHub Pages. The Edge Function retains its older embedded fallback page for compatibility; the public journal link uses GitHub Pages.

The frontend authenticates through existing parent/family sessions. Only parents can add venue news. Collector authentication is separate and cannot add venue news. The venue log never overwrites official ranks or bouts. Direct anonymous/authenticated database access to this table is disabled.

`push.ts` is deployed as the `vili-push` Edge Function. `notification_schedule.sql` adjusts the installed authenticated dispatch job to check current competitions every two minutes when the journal has a race dated today or yesterday in Bratislava. Subscriptions and notification history are retained in the existing tables.
