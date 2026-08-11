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

## Deterministic match intelligence

The provider-independent `historical-v1` model transforms `MatchAnalysisInput` into a typed `MatchIntelligenceResult`. It returns bounded 1X2 and goal-market probability estimates, historical scoring/conceding goal expectations, normalized team-strength scores, evidence-quality confidence and machine-readable supporting factors. Identical input and model configuration always produce identical output; there is no randomness or implicit current-time dependency.

Team-strength weights are explicit and configurable: season points per game 20%, season goal difference 12%, season attack 10%, season defence 10%, recent points per game 18%, recent win rate 8%, venue-specific points per game 15%, scoring rate 4% and clean-sheet rate 3%. H2H is a separately capped adjustment of at most 5%, scaled down until eight stored meetings are available, so a small H2H sample cannot dominate. Home advantage comes from the home team's persisted home record versus the away team's persisted away record; the model adds no unexplained home constant.

Goal expectations average the home side's home scoring rate with the away side's away conceding rate, and vice versa. These are historical model-derived expectations, not event-level expected-goals (`xG`) data. Goal-market estimates blend the resulting Poisson-style total-goal distribution with normalized recent venue trends. When venue evidence is absent, goal expectations and markets remain unavailable rather than fabricating data.

Confidence describes evidence quality, not the size of a probability. Historical, recent, venue and H2H sample sizes plus the upstream completeness classification determine `low`, `moderate` or `strong`. Sparse inputs produce neutral 1X2 estimates, nullable goal markets, low confidence and limiting factors.

The intended pipeline is:

`data provider -> normalized ingestion -> Supabase persisted football data -> historical analytics -> MatchAnalysisInput -> deterministic intelligence engine -> MatchIntelligenceResult -> future OpenAI explanation layer -> future 9jaFootballAI presentation/API layer`

Prediction calculation makes no football-provider request once normalized history is persisted. Future viewers must read a centrally generated/stored result rather than trigger provider work per user. The model remains compatible with a future centralized live-data refresh subsystem because neither calculation nor presentation owns ingestion.

## Chronological model backtesting

The provider-independent backtesting layer measures `historical-v1` with walk-forward evaluation. For every eligible completed fixture, it creates a point-in-time dataset containing only fixtures with kickoff timestamps strictly earlier than the target, builds `MatchAnalysisInput`, records the historical prediction, and then compares that prediction with the target's actual result. The target, simultaneous fixtures and all later fixtures are excluded. This prevents target-result, final-table, future-form, future-H2H and future venue-statistics leakage.

The default minimum is five prior completed matches for both teams. Every excluded fixture remains counted under a specific insufficient-history reason. Evaluation reports top-pick accuracy, multiclass Brier score, log loss, confidence and team breakdowns, calibration buckets, goal-market accuracy/Brier scores at a documented 0.5 classification threshold, and home/away/total historical goal-expectation MAE. Unsupported null market estimates are excluded rather than counted as failures.

Two untuned point-in-time baselines are included: equal one-third 1X2 probabilities, and the competition's home/draw/away result frequencies from fixtures completed before kickoff. Equal-probability top-pick accuracy uses deterministic home tie handling only to make the count reproducible; its Brier score and log loss are the meaningful probability-quality comparisons.

Backtesting follows:

`persisted history -> strict point-in-time snapshot -> MatchAnalysisInput -> historical-v1 -> historical prediction -> actual result -> evaluation and calibration metrics`

Stage B4 measures the frozen `historical-v1` model. It does not tune weights, introduce a new model version, publish predictions, or call API-Football/OpenAI. Scottish Premiership 2024 remains development/test evaluation data only.

## Multi-league historical development data

Batch 4H.5 adds a server-only, quota-bounded historical expansion workflow. It validates a league identity, retrieves league-season teams and the complete fixture collection with two or three provider requests, and persists normalized entities and fixture metadata through bounded bulk upserts. It never makes one request per fixture and never invokes predictions or backtesting.

The 2024 development datasets successfully persisted are Premier League (`39`), La Liga (`140`), Serie A (`135`) and Bundesliga (`78`). Ligue 1 (`61`) was verified by a valid France/2024 discovery response, but its subsequent bundle was rejected by the provider quota and was not persisted or retried. These are historical development datasets, not current 9jaFootballAI production intelligence.

Provider team identities are protected from silent cross-competition reassignment. A conflicting provider identity stops the affected bundle; existing teams, competitions and fixtures remain intact. Competition-season and fixture-provider uniqueness, demo collision checks, normalized statuses, score validation and provider provenance remain enforced. Exact provider season date fields were retained only for the Ligue 1 discovery; for the other leagues, the normalized adapter did not retain raw season date fields, so persisted fixture coverage is reported without inventing metadata.

## Multi-league out-of-sample evaluation

Batch 4H.6 evaluates the unchanged `historical-v1` model independently on Premier League, La Liga, Serie A and Bundesliga 2024. Each walk-forward run retains the five-prior-match threshold and strict kickoff cutoff: target, same-kickoff and later fixtures cannot enter evidence. League-season datasets are loaded and evaluated separately before weighted aggregate reporting, preventing cross-competition or cross-season evidence.

The four leagues produced 1,251 eligible predictions from 1,448 fixtures. Aggregate top-pick accuracy was 50.36%, multiclass Brier score 0.6049 and log loss 1.0109. Results were stable by league: accuracy 49.09–52.42%, Brier 0.5912–0.6185 and log loss 0.9902–1.0286. `historical-v1` beat equal-1X2 and prior-result-frequency baselines on Brier score and log loss in every evaluated league.

The generalisation evidence is **promising but not production-ready**. The principal defect is structural: the model selected zero draws across all four leagues despite 319 actual draws. It therefore over-selects decisive home and away outcomes. Moderate evidence quality performed slightly better in aggregate than low evidence quality, but Bundesliga showed the reverse and no out-of-sample prediction reached `strong`; normal double-round-robin H2H samples do not satisfy the current strong-confidence evidence rule. BTTS and Over 2.5 discrimination remain weak, while Over 1.5 and Over 3.5 were more useful historically.

These results are historical development/backtesting evidence, not claims of guaranteed future betting performance. No model weight, formula, version, production prediction, provider data or OpenAI service was changed or invoked during evaluation. Any tuning must create a separately reviewed future model version.
