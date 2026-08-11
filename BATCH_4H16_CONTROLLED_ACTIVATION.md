# Batch 4H.16 — Controlled Development Activation

## Outcome

**Infrastructure activated; no eligible genuine live fixtures.** No prediction was fabricated or persisted.

## Environment and migration

The target was verified in the authenticated Supabase dashboard as **ScoreGPT Development**, project reference `oislplqdvtaajqxbwvut`. This matches the configured project URL and the known Scottish Premiership 2024 development dataset. No credential was displayed or copied.

Migration `202608100001_batch_4h15_shadow_predictions.sql` was inspected and corrected before application to include run provenance and explicit run source/status fields. It is additive and contains no drop, truncate, delete, historical-data rewrite, public grant, or publication trigger.

The migration was applied to Development only. It created:

- `football_shadow_predictions`
- `football_shadow_runs`
- Canonical identity, ranking, settlement and run indexes
- Probability range/sum and timestamp constraints
- Fixture, competition and team foreign keys
- Shadow-only operational-state constraints

RLS is enabled on both tables. There are no policies and no anon/authenticated table privileges. Initial prediction and run counts were both zero.

## Server-only fixture source

`loadPersistedShadowFixtureSources()` is server-only and reads the Development database before any provider consideration. It matches internal competition policy against provider competition ID, provider name, country and season. It accepts a maximum 168-hour horizon and has no provider, API-key, browser or public-route dependency.

## Database-only dry runs

Run timestamp: `2026-08-10T14:01:01.830Z`.

Supported configuration checked: Scottish Premiership, API-Football league ID 179, provider name `Premiership`, Scotland, development/test season 2024.

Persisted source contained 234 finished fixture rows and 15 team rows. The source returned zero upcoming fixtures in both windows:

| Window | Upcoming fixtures | Eligible | Proposed predictions | Top Picks | Writes | Provider requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 72 hours | 0 | 0 | 0 | 0 | 0 | 0 |
| 168 hours | 0 | 0 | 0 | 0 | 0 | 0 |

Both reports completed deterministically with zero publications and zero notifications.

## Provider-refresh decision

Provider refresh was not justified. The only enabled mapping is development season 2024, which is out of season in August 2026. Refreshing it cannot produce a genuine current pre-kickoff fixture. The intended 2026/current-season dataset requires appropriate API-Football subscription access. Provider requests: **0**.

## Persistence gate

The gate failed closed only because there were zero legitimate eligible future fixtures. No shadow run row and no shadow prediction row were written. Historical fixtures, demo fixtures and altered kickoff timestamps were not substituted.

Stable versions remain `historical-v1-frozen-4h`, `compact-composite-4h9`, and `selective-publishing-4h14`. Public publishing, notifications, OpenAI, cron and settlement remain inactive.

## Rollback posture

The applied schema is valid and empty, so no rollback is required. It should remain available for the next controlled activation. Once genuine forward records exist, they must be preserved rather than deleted during recovery.

## Recommendation

Before another activation attempt, obtain current-season provider access and explicitly approve a verified current competition/season mapping. Then refresh only that competition's fixtures within a bounded request ceiling, persist them, repeat the database-only dry run, and separately review the proposed predictions before persistence.
