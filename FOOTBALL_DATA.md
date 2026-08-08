# Football data ingestion

Batch 4E prepares a production API-Football adapter behind the existing provider-neutral ingestion contracts. The provider remains disabled, no credential is configured, and no external football request is made by the application or by normal page rendering.

## Runtime boundaries

The controlled flow is:

`manual privileged runner` → `FootballBootstrapWorkflow` → `FootballDataIngestionService` → `FootballDataProvider` → normalized records → `FootballIngestionRepository` → Supabase.

`ApiFootballProvider` owns API-Football endpoints, headers, timeouts, response validation and raw response types. It returns only normalized competitions, teams, fixtures, scores and provider-neutral snapshots. Provider JSON never enters React components or public business logic. The homepage, Match Centre, Results and report pages read existing intelligence/repository data and cannot invoke ingestion.

API-level errors inside HTTP 200 responses are failures and are classified from structured provider error keys before sanitized message text. Categories distinguish authentication, quota/rate limit, subscription or plan access, invalid parameters, invalid/unavailable seasons, generic provider failures and malformed responses. The exact configured credential and credential-like strings are redacted from safe diagnostics. Audit rows store only a stable sanitized error code; authentication headers and raw provider envelopes are never logged or persisted.

The adapter supports the provider endpoints needed for competition/season metadata, teams, fixtures and statuses, scores/results, standings, recent team form, head-to-head fixtures, injuries, lineups, match statistics and odds metadata. Rich fixture categories are fetched individually so a request for one category does not consume the complete set.

## Disabled-by-default and credentials

The checked-in defaults are:

```text
FOOTBALL_DATA_PROVIDER=disabled
FOOTBALL_DATA_PROVIDER_ENABLED=false
FOOTBALL_API_KEY=
FOOTBALL_API_DAILY_REQUEST_BUDGET=30
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

For the controlled Batch 4H development phase, only the Scottish Premiership is enabled. A tightly filtered API-Football response verified league ID `179`, type `League`, for Scotland. Season `2024` is explicitly a Free-plan development/test season; it is not the intended production season. Production remains dependent on current-season access under an appropriate API-Football subscription. Premier League and the other 28 competitions remain disabled. Previously documented mappings may remain in configuration for later review, but they are not activation authorization. Adding a name or mapping to the registry does not claim live coverage.

## Manual bootstrap and dry-run

`runManualFootballBootstrap()` is a server-only function that requires an explicitly supplied privileged Supabase client. There is no HTTP or public ingestion route.

Bootstrap stages are:

- Stage A: competition metadata and teams;
- Stage B: upcoming fixtures;
- Stage C: recent results and standings;
- Stage D: selective rich fixture categories after persisted fixtures are reviewed.

Dry-run is the default. `Premier League Bootstrap — Stage A` requests only competition/season metadata and teams. A cold-cache run is estimated at two provider requests; fresh cache can reduce that estimate to zero. Preflight reports competition identity, provider mapping, season, enabled state, requested/cached/stale categories, estimated requests, requests used today, the budget before and after execution, eligibility, a precise block reason and an explicit quota warning. It makes zero provider calls and performs no ingestion writes.

A future non-dry execution requires all of the following: a privileged server client, provider enabled, credential configured, sufficient estimated budget, and the exact `CONSUME_PROVIDER_QUOTA` confirmation. Stage D remains plan-only at competition level because rich data must be selected by fixture instead of bulk-fetched.

## Idempotency, persistence and homepage readiness

Supabase upserts use provider/season or provider/entity IDs as conflict keys while keeping internal UUID primary keys. Repeating a competition, team, fixture or snapshot ingestion updates existing records and preserves internal identity. Standings are stored as normalized snapshots; scores and result status update existing fixture rows.

Persisted competitions, fixtures, results, snapshots and intelligence reports already provide the data boundary required for a future homepage repository. Direct provider calls are not needed or permitted from UI components.

## Quota observability

`getQuotaStatus()` reports requests used today, configured internal budget, remaining budget, cache hits, provider attempts, successes and failures. It uses the RLS-protected `football_provider_requests` audit table and is prepared for a future admin dashboard; it is not publicly exposed.

## Free-plan quota policy

The current API-Football FREE PLAN limit is 100 requests per day. The application-side ceiling is deliberately lower at 30 requests per day, reserving capacity for provider-dashboard checks and debugging. These are separate controls: API-Football enforces its plan quota, while the application blocks estimated work beyond its configured internal budget. The internal ceiling may be changed manually later after review; it must not silently follow or rise to the provider limit.

## First-ingestion operator runbook

1. Register the API-Football account. **Complete.**
2. Confirm the FREE PLAN allowance. **Currently 100 requests/day.**
3. Add `FOOTBALL_API_KEY` only to the chosen encrypted server environment. Never use a `NEXT_PUBLIC_` variable.
4. Set `FOOTBALL_DATA_PROVIDER=api-football`, `FOOTBALL_DATA_PROVIDER_ENABLED=true`, and `FOOTBALL_API_DAILY_REQUEST_BUDGET=30` in that server environment.
5. Confirm Premier League provider ID `39` and the current season directly in API-Football.
6. Invoke `runManualFootballBootstrap()` with Stage A, Premier League, and `dryRun: true`. This performs zero provider requests.
7. Review requested/cached/stale categories, the estimated request count, audit usage, and remaining internal budget.
8. Only after explicit human approval, invoke the same trusted server-side runner with `dryRun: false` and confirmation `CONSUME_PROVIDER_QUOTA`.
9. Check the API-Football dashboard for actual request consumption.
10. Run `runManualFootballVerification()`; it reads Supabase and the internal audit only and reports `providerCallsMade: 0`.
11. Inspect normalized competition/team records in Supabase, including provider IDs, provenance and timestamps.
12. Inspect the homepage, Match Centre and Premier League page. They read persistence and never call the provider.
13. Do not enable or ingest another competition until every check passes.

Live execution rejects a missing/incorrect confirmation, disabled provider, missing credential, missing/invalid provider ID, invalid season, Stage D bulk operation, and estimated budget overflow. There is no public ingestion route, cron, page-triggered ingestion, or browser execution path.

A paid provider plan changes configuration and budget, not the public UI or provider-neutral service/repository contracts.

## Database status

No Batch 4E migration is required. Batch 4E reuses the existing `football_provider_requests`, normalized football tables and snapshot constraints introduced by the applied Batch 4A/4C migrations.

## Provider-free historical intelligence

9jaFootballAI reconstructs **Calculated Historical Standings** and team intelligence from normalized completed fixtures already persisted in Supabase. These tables are descriptive calculations (three points for a win, one for a draw), not official provider standings. Sorting uses points, goal difference and goals scored; unavailable provider-specific tie-breakers are not invented.

The historical engine loads a competition, teams, fixtures and normalized round metadata as one bounded dataset, then calculates standings, home/away and recent form, goal trends, head-to-head summaries and raw form-strength features in memory. It consumes no API-Football response objects and generates no predictions.

Participant classification uses persisted round metadata. Teams appearing in normal competition rounds are `regular`; teams appearing only in explicitly labelled playoff/relegation rounds are `playoff_only`; insufficient evidence yields `unknown`. All records remain preserved. The Scottish Premiership 2024 calculated regular table contains 12 league participants, while Ayr Utd, Livingston and Partick remain available as playoff participants.

`MatchAnalysisInput` combines both team profiles, venue-relevant form, recent-N form, goal trends, H2H history, latest-data date and deterministic data-completeness metadata. It is an internal historical-analysis contract for a future intelligence provider, not a probability, prediction or betting recommendation.

Season 2024 remains development/test data only. Current production-season analysis requires appropriate provider access and separately authorized ingestion.
