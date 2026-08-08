# Football data ingestion

Batch 4C adds a provider-neutral, cache-first football data pipeline. It does not configure or call a live football API.

## Runtime flow

`scheduler/manual server action` → `FootballDataIngestionService` → `FootballDataProvider` → normalized records → `FootballIngestionRepository` → Supabase.

Provider-specific response types belong inside the future adapter. The adapter returns only `CompetitionIngestionPayload` or `FixtureRefreshPayload`, so repositories, intelligence services, and UI code never depend on an API-Football response shape.

The current composition root uses `DisabledFootballDataProvider`. Without a provider, ingestion returns a degraded/skipped result and the approved database/demo presentation remains available. It makes no external request.

## Cache-first behavior

Snapshot reads first ask the repository for `(fixture_id, data_type, provider)`:

1. Fresh data is returned immediately and records a zero-cost cache hit.
2. Stale or missing data is refreshed only when the injected provider is enabled and budget remains.
3. A provider failure returns stale data when available.
4. A Supabase outage returns a graceful unavailable result when live ingestion is disabled.

Freshness is centralized in `modules/football-data/freshness.ts`:

- competition, season and team metadata: about 24 hours;
- upcoming fixture data: about 6 hours;
- data within two hours of kickoff: about 45 minutes;
- live data: about 45 seconds (future-ready; live ingestion is disabled);
- finished/cancelled fixtures: durable with no expiry. Categories that later need correction can still be refreshed explicitly.

## Competition scope

`config/football-data.ts` owns enabled competitions, provider IDs, current seasons, ordering, and refresh priority. Disabled or unknown competitions are skipped before a provider can be called. This is the single configuration point for future league rollout.

## Request budget and provenance

`football_provider_requests` records provider, category, endpoint, timestamp, request count, success/failure, cache state, refresh reason, and safe error code. Fresh cache hits have `request_count = 0`; attempted provider calls count even when they fail. `FOOTBALL_API_DAILY_REQUEST_BUDGET` defaults to 100.

Every snapshot exposes provider, provider reference, fetched/expiry timestamps, cache state, and demo status. Internal UUIDs remain database identities; provider IDs remain separate deduplication keys.

## Scheduling and idempotency

`ingestEnabledCompetitions("scheduled")` is the future cron entry point. `ingestCompetition(id, "manual")` is the future admin refresh entry point. Both use provider-key upserts, so retries update existing competitions, teams, fixtures, and snapshots rather than duplicating them.

Concurrent stale reads in one server instance share an in-flight refresh promise keyed by provider, fixture and category. A future distributed scheduler should add a database/advisory or durable queue lock for protection across multiple Vercel instances.

No cron route is exposed in this batch. A future scheduler must create a privileged, server-only Supabase client and inject it into `createFootballDataIngestion`; the public publishable client intentionally has no ingestion write policy.

The future privileged credential belongs in an explicitly server-only module such as `lib/supabase/admin.ts`, guarded by `import "server-only"`. Store it in Vercel as an encrypted server environment variable (for example `SUPABASE_SERVICE_ROLE_KEY`, or the current Supabase server-secret equivalent selected at implementation time), scoped independently for Development/Preview and Production. It must never use a `NEXT_PUBLIC_` prefix, enter `.env.example` with a value, or be imported by client components. The eventual football-provider key follows the same server-only rule and belongs only in the provider adapter/scheduler boundary.

## Future API-Football adapter

Implement `FootballDataProvider` in a server-only adapter:

1. keep API credentials and raw payload types inside the adapter;
2. map statuses and identifiers through normalization helpers;
3. return normalized competition/fixture payloads;
4. inject the adapter and privileged Supabase client at the composition root;
5. enable the provider through server environment configuration only after approval.

No UI rewrite is required. Match Centre, Results, homepage, and reports continue consuming provider-neutral intelligence models. They deliberately retain demo-safe presentation until complete persisted fixture/report records are available.

## Environment variables

- `FOOTBALL_DATA_PROVIDER=disabled`
- `FOOTBALL_DATA_PROVIDER_ENABLED=false`
- `FOOTBALL_API_DAILY_REQUEST_BUDGET=100`

No API key variable is introduced in Batch 4C.

## Migration and manual follow-up

Apply `supabase/migrations/202608080002_batch_4c_football_ingestion.sql` to the Development project after review. It expands snapshot categories for odds metadata and adds the server-only request audit table with RLS and no public policies or grants.
