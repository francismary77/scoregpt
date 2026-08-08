# Football data ingestion

Batch 4E prepares a production API-Football adapter behind the existing provider-neutral ingestion contracts. The provider remains disabled, no credential is configured, and no external football request is made by the application or by normal page rendering.

## Runtime boundaries

The controlled flow is:

`manual privileged runner` → `FootballBootstrapWorkflow` → `FootballDataIngestionService` → `FootballDataProvider` → normalized records → `FootballIngestionRepository` → Supabase.

`ApiFootballProvider` owns API-Football endpoints, headers, timeouts, response validation and raw response types. It returns only normalized competitions, teams, fixtures, scores and provider-neutral snapshots. Provider JSON never enters React components or public business logic. The homepage, Match Centre, Results and report pages read existing intelligence/repository data and cannot invoke ingestion.

The adapter supports the provider endpoints needed for competition/season metadata, teams, fixtures and statuses, scores/results, standings, recent team form, head-to-head fixtures, injuries, lineups, match statistics and odds metadata. Rich fixture categories are fetched individually so a request for one category does not consume the complete set.

## Disabled-by-default and credentials

The checked-in defaults are:

```text
FOOTBALL_DATA_PROVIDER=disabled
FOOTBALL_DATA_PROVIDER_ENABLED=false
FOOTBALL_API_KEY=
FOOTBALL_API_DAILY_REQUEST_BUDGET=10
FOOTBALL_INGESTION_DRY_RUN=true
```

Both the provider identifier and the explicit enabled switch must be set before the adapter is live. A missing key fails safely before transport is called. `FOOTBALL_API_KEY` is read only in the server configuration boundary; it must never use `NEXT_PUBLIC_`, enter a browser bundle, be printed, or be committed. `.env.local` remains owner-managed and ignored.

## Cache-first request protection

Snapshot reads follow this order:

1. Read persisted cache.
2. Return fresh data and audit a zero-request cache hit.
3. Verify the competition/category mapping and refresh requirement.
4. Estimate the provider calls required by the exact operation.
5. Check that used requests plus the estimate remain within the internal daily budget.
6. Only then invoke the adapter.

Failed provider transports are audited because a provider may count them. Missing credentials make zero network attempts and are recorded with zero request count. Stale cache is returned when refresh fails; missing cache degrades without crashing public pages. Concurrent stale reads in one instance share one refresh promise.

Freshness remains conservative:

- competition, season and team metadata: approximately 24 hours;
- ordinary upcoming fixture data: approximately 6 hours;
- within two hours of kickoff: approximately 45 minutes;
- live fixtures: approximately 45 seconds as a future capability;
- finished or cancelled fixtures: durable, with no automatic expiry.

## Competition activation

`config/football-data.ts` is the single rollout registry for 30 top leagues and competitions. Each entry contains an internal ID, nullable provider ID, name, country/region, nullable current season, priority, enabled state, homepage feature state, category list and refresh priority.

The five previously configured demonstration competitions retain their documented API-Football mappings. The other 25 entries are disabled and deliberately have no invented provider IDs or seasons. Adding a name to the registry does not claim live coverage. Competitions should be mapped, validated and enabled gradually after the provider account is approved.

## Manual bootstrap and dry-run

`runManualFootballBootstrap()` is a server-only function that requires an explicitly supplied privileged Supabase client. There is no HTTP or public ingestion route.

Bootstrap stages are:

- Stage A: competition metadata and teams;
- Stage B: upcoming fixtures;
- Stage C: recent results and standings;
- Stage D: selective rich fixture categories after persisted fixtures are reviewed.

Dry-run is the default. It reports the competition, stage, categories, mapping/enabled state, whether persisted competition data exists, estimated requests, requests already used, configured budget and remaining budget. It makes zero provider calls and performs no ingestion writes.

A future non-dry execution requires all of the following: a privileged server client, provider enabled, credential configured, sufficient estimated budget, and the exact `CONSUME_PROVIDER_QUOTA` confirmation. Stage D remains plan-only at competition level because rich data must be selected by fixture instead of bulk-fetched.

## Idempotency, persistence and homepage readiness

Supabase upserts use provider/season or provider/entity IDs as conflict keys while keeping internal UUID primary keys. Repeating a competition, team, fixture or snapshot ingestion updates existing records and preserves internal identity. Standings are stored as normalized snapshots; scores and result status update existing fixture rows.

Persisted competitions, fixtures, results, snapshots and intelligence reports already provide the data boundary required for a future homepage repository. Direct provider calls are not needed or permitted from UI components.

## Quota observability

`getQuotaStatus()` reports requests used today, configured internal budget, remaining budget, cache hits, provider attempts, successes and failures. It uses the RLS-protected `football_provider_requests` audit table and is prepared for a future admin dashboard; it is not publicly exposed.

## Manual activation checklist

After approval in a future batch:

1. Register and verify the chosen provider account without placing credentials in source control.
2. Configure the encrypted server-only key in the target environment.
3. Map and validate one competition and season at a time.
4. Keep the internal daily budget below the provider plan allowance.
5. Run dry-run and review its estimate.
6. Supply a privileged Supabase client through a trusted manual runner.
7. Execute one small stage with explicit confirmation and inspect audit/cache results.
8. Expand competition/category coverage only after observed request usage is acceptable.

A paid provider plan changes configuration and budget, not the public UI or provider-neutral service/repository contracts.

## Database status

No Batch 4E migration is required. Batch 4E reuses the existing `football_provider_requests`, normalized football tables and snapshot constraints introduced by the applied Batch 4A/4C migrations.
