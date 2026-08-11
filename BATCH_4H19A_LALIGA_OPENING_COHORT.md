# Batch 4H.19A — La Liga Opening Cohort Preflight & Freeze

## Outcome

The La Liga opening cohort was successfully frozen in the authorized Development Supabase project `oislplqdvtaajqxbwvut` after FIX1–FIX3 corrected and populated season-aware team memberships.

- Fresh execution timestamp: `2026-08-11T00:22:13.771Z`
- Shadow run: `shadowrun_20260811T002213771Z`
- Fixtures inspected: **10**
- Fixtures inside 168 hours: **6**
- Eligible and frozen: **4**
- Top Picks: **0**
- New predictions: **4**
- Total shadow predictions: **29**

## Frozen predictions

| Fixture ID | Fixture | Kickoff UTC | Selection | H / D / A | Confidence | Tier | Evidence cutoff UTC | Immutable fingerprint |
|---|---|---|---|---|---|---|---|---|
| 1570333 | Alaves vs Getafe | 2026-08-15T17:30:00Z | Home | 0.3478 / 0.3066 / 0.3456 | MODERATE | STANDARD_ANALYSIS | 2026-05-24T19:00:00Z | `1a8ae05a67a7bfbd929cb2115da08f8b2be6553e761125da018115774dac9251` |
| 1570341 | Sevilla vs Rayo Vallecano | 2026-08-15T19:30:00Z | Away | 0.3109 / 0.3023 / 0.3868 | STRONG | STANDARD_ANALYSIS | 2026-05-24T19:00:00Z | `a7476fc55647f6e49d08397488cfa03cd8e76d6864ffa8dd9bdeb1cf58636ae7` |
| 1570338 | Espanyol vs Levante | 2026-08-16T17:00:00Z | Away | 0.3382 / 0.3080 / 0.3538 | MODERATE | STANDARD_ANALYSIS | 2026-05-24T19:00:00Z | `7bdd20ff8f9f1062fb6fcbc930a0a76f037bc7c2f4113cad37ccde7c03eb5a4a` |
| 1570336 | Celta Vigo vs Osasuna | 2026-08-16T19:30:00Z | Home | 0.5439 / 0.2650 / 0.1911 | STRONG | STANDARD_ANALYSIS | 2026-05-24T19:00:00Z | `a33e9805f1d225d8d66da4476b2308b0003f71530d330d71c5a438a47c59b2a0` |

Every row is permanently stored as `SHADOW_ONLY` / `PENDING`. Prediction creation and freeze timestamp is `2026-08-11T00:22:13.771Z` for all four rows.

## Exclusions

- Racing Santander vs Villarreal (`1570339`): `INSUFFICIENT_COMPARABLE_HISTORY`; promoted-club safeguard retained.
- Deportivo La Coruna vs Elche (`1570337`): `INSUFFICIENT_COMPARABLE_HISTORY`; promoted-club safeguard retained.
- Atletico Madrid vs Malaga (`1570334`): outside 168 hours.
- Valencia vs Real Betis (`1570342`): outside 168 hours.
- Real Madrid vs Real Sociedad (`1570340`): outside 168 hours.
- Barcelona vs Athletic Club (`1570335`): outside 168 hours.

No excluded fixture was manually overridden. No Top Pick was forced.

## Provider requests

The successful freeze pass used exactly **4** requests with no retries:

1. `leagues?id=140`
2. `teams?league=140&season=2026`
3. `fixtures?league=140&season=2026`
4. `fixtures?league=140&season=2025`

An immediately preceding failed read-back attempt consumed the same four validated endpoints but created no shadow run or prediction. It stopped because its database query did not qualify La Liga by season. The query was corrected to require season 2026 before the successful fresh pass. Total provider requests during this retry task: **8**.

## Integrity verification

- Shadow runs: **2 before, 3 after**.
- Shadow predictions: **25 before, 29 after**.
- Cohort #1: **10**, unchanged.
- Cohort #2: **15**, unchanged.
- New La Liga cohort: **4**.
- New rows `SHADOW_ONLY` / `PENDING`: **4/4**.
- Idempotent replay rows created: **0**.
- Duplicate fixture/prediction identities: **0**.
- Invalid probability vectors: **0**.
- Invalid prediction timing: **0**.
- Invalid evidence timing: **0**.
- Non-shadow prediction rows: **0**.
- Historical completed fixtures: **1,990**, unchanged.
- Anonymous shadow-table access: denied with HTTP 401.
- Public predictions written: **0**.
- Notifications sent: **0**.
- Production access: **0**.

## Verification suite

- TypeScript: passed.
- ESLint: passed.
- Complete automated suite: **240 passed, 0 failed**.
- Production/Vercel-compatible build: passed.
- No commit, push, deployment, public publication, scheduler activation, or later batch occurred.

4H19A_LALIGA_COHORT_FROZEN = TRUE
