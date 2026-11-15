# Backend snapshot

`index.ts` is the deployed v6 Supabase Edge Function `vili-vivonaplo` (2026-11-15). It uses the existing project tables and environment secrets. No real credentials are included. `event_live_updates.sql` records the additive migration for venue updates; it does not recreate the entire pre-existing database.

The current frontend is `../index.html`, served by GitHub Pages. The Edge Function retains its older embedded fallback page for compatibility; the public journal link uses GitHub Pages.

The frontend authenticates through existing parent/family sessions. Only parents can add venue news. Collector authentication is separate and cannot add venue news. The venue log never overwrites official ranks or bouts. Direct anonymous/authenticated database access to this table is disabled.
