# Batch 4H.19A-FIX — Team / Competition Identity Persistence Correction

## Outcome

The structural correction is implemented and fully verified in code, migration, and provider-free tests. The additive migration has **not** been applied to the authorized Development database because the configured environment exposes neither a database password/connection string, a Supabase management token, nor an approved SQL RPC. The live Development persistence path therefore remains intentionally blocked, and 4H.19A must not yet be retried.

Authorized environment inspected: Development project `oislplqdvtaajqxbwvut`. Production was not accessed.

## Root cause and exact conflict

`teams` correctly enforces one canonical row per `(provider, provider_id)`, but also contains one nullable `competition_id`. The ingestion repository previously required every existing team's `competition_id` to equal the incoming competition-season row. A returning team could therefore not move from La Liga 2024 membership to La Liga 2026 membership without either overwriting history or duplicating its canonical identity.

The required competition is:

- La Liga, Spain, provider league `140`, season `2026`
- Canonical competition ID: `16bfc5ed-908d-403d-a6ff-8acc8a1bce1f`

The conflict query returned 15 existing canonical teams, all attached through the legacy field to La Liga 2024 (`a455c726-17ba-4ba1-a314-d6f83de12cb5`) while the incoming fixtures require La Liga 2026:

| Provider team ID | Canonical team ID | Team |
|---|---|---|
| 529 | d1660d8f-9271-4c2c-931a-68f7504831a5 | Barcelona |
| 530 | c3bac682-28de-4335-ad69-cfee12820190 | Atletico Madrid |
| 531 | 227a68f9-77b3-4c40-820b-e270efc1af3b | Athletic Club |
| 532 | b7861fdc-0345-4b93-84e4-1b639cca48c7 | Valencia |
| 533 | e8f29de8-4fc5-4d22-9e89-11565be7b10b | Villarreal |
| 536 | 43af64df-484d-4110-aaf8-511a3da840ef | Sevilla |
| 538 | 106aa48e-855e-46da-816a-d2ebc1572f63 | Celta Vigo |
| 540 | 08a15ef7-b56c-4cee-aa12-db4d2c001ef5 | Espanyol |
| 541 | d64f9967-2fe1-4c38-aac1-715d5c675fad | Real Madrid |
| 542 | ff85b92e-4de5-4bdb-af51-413306f280c4 | Alaves |
| 543 | 3850f64c-2413-41a1-bcb0-e78d25a856f8 | Real Betis |
| 546 | c620576d-8248-4b18-b9c8-d311d65c3445 | Getafe |
| 548 | d6a7c909-8344-4bae-a072-d1c4069af882 | Real Sociedad |
| 727 | 0c8e2e61-cbf9-4fdf-bb9c-8d3d88e20cb7 | Osasuna |
| 728 | 765fde97-4030-4911-9dd8-ff641ff85bd1 | Rayo Vallecano |

Barcelona/provider team `529` is the first concrete example. The repository's previous query returned a conflict set rather than a deterministic first row; all 15 records above independently trigger the same rejection.

## Structural correction

The new private `team_competition_seasons` table represents membership separately:

`canonical team -> team_competition_seasons -> competition-season`

Properties:

- Canonical provider identity remains unique through the existing `(provider, provider_id)` team constraint.
- Membership is unique by `(team_id, competition_id)`.
- The referenced `competitions` row remains the source of provider competition, country, and season identity.
- A validation trigger requires the team and competition providers to match.
- Existing non-null `teams.competition_id` relationships are backfilled additively.
- RLS is enabled and access is revoked from anonymous/authenticated roles.
- `teams.competition_id` remains as a legacy compatibility pointer; it is not dropped, rewritten, or used by new persistence.
- No historical records, provider IDs, fixture relationships, or shadow relationships are deleted or rewritten.

Repository changes:

- Canonical team upserts no longer overwrite `competition_id`.
- Single and bulk team ingestion idempotently upsert membership rows.
- Fixture-only ingestion resolves canonical teams and verifies membership for the target competition-season.
- Competition inspection and persisted shadow-fixture reads resolve teams through memberships.
- The memory repository mirrors the same canonical identity/membership design.

## Migration status

Migration created:

`supabase/migrations/202608110001_team_competition_season_membership.sql`

The migration is additive, transactional, idempotent, backfills existing memberships, and retains all old foreign keys. It was **not applied** to Development. A safe read-only OpenAPI inspection confirmed that Development exposes no SQL/migration RPC. `.env.local` contains no database password, database connection string, or Supabase management token, so bypassing normal migration controls was not attempted.

Required manual action: link a trusted Supabase CLI session to Development project `oislplqdvtaajqxbwvut` and apply the checked-in migration, then rerun the provider-free diagnostic/read-back before authorizing 4H.19A.

## Safe persistence-path verification

The corrected path was reproduced without provider calls or shadow writes using the same canonical-team reuse condition:

- Same provider team across 2024 and 2026 resolves to one canonical UUID and two memberships.
- Same provider team across different competitions resolves to one canonical UUID and two memberships.
- Promoted-team membership persists independently and remains idempotent.
- Fixture upsert retains a stable provider fixture identity and stable canonical team foreign keys.
- Repeated ingestion creates no duplicate canonical teams, memberships, or fixtures.
- Frozen shadow foreign keys continue to reference canonical `teams` rows and are not changed by the migration.

The live four-fixture Development resolution was not executed because the membership table is not yet present. Claiming that live gate passed would be unsafe.

## Development database integrity read-back

After all corrective work:

- Completed historical fixtures: **1,990**, unchanged.
- Total fixtures: **2,017**, unchanged.
- Canonical teams: **167**, unchanged.
- Duplicate canonical provider team IDs: **0** in the diagnostic result.
- Shadow runs: **2**, unchanged.
- Shadow predictions: **25**, unchanged and all pending.
- Cohort #1: **10** predictions under `shadowrun_20260810T194650130Z`, unchanged.
- Cohort #2: **15** predictions under `shadowrun_20260810T221803419Z`, unchanged.
- Invalid probability vectors: **0**.
- Invalid prediction timing: **0**.
- Invalid evidence timing: **0**.
- Non-shadow prediction rows: **0**.
- Anonymous shadow-table access remains denied with HTTP 401.
- New canonical teams introduced: **0**.
- Public writes: **0**.
- Notifications: **0**.
- Production access: **0**.
- API-Football requests in this corrective batch: **0**.

The one pre-existing published intelligence report remains unrelated and unchanged.

## Tests and checks

- Focused tests: **64 passed, 0 failed**.
- Complete automated suite: **240 passed, 0 failed**.
- TypeScript: passed (`tsc --noEmit`).
- ESLint: passed.
- Production/Vercel-compatible build: passed (`vinext build`).
- Migration safety tests cover additive backfill, RLS, no destructive SQL, provider uniqueness, and unchanged shadow team foreign keys.
- Regression coverage includes same team across seasons, same team across competitions, promoted teams, provider identity uniqueness, duplicate prevention, fixtures, historical compatibility, shadow persistence compatibility, and idempotent upsert.
- No commit, push, deploy, scheduler activation, public publication, or later batch occurred.

## Files changed for this correction

- `supabase/migrations/202608110001_team_competition_season_membership.sql`
- `lib/supabase/database.types.ts`
- `modules/persistence/football-repositories.ts`
- `modules/persistence/shadow-fixture-source.ts`
- `modules/football-data/memory-repositories.ts`
- `tests/historical-expansion.test.mjs`
- `tests/team-competition-identity.test.mjs`
- `tools/batch-4h19a-fix-diagnostic.mjs`
- `BATCH_4H19A_FIX_TEAM_COMPETITION_IDENTITY.md`

READY_TO_RETRY_4H19A = FALSE
