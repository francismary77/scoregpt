# Batch 4H.19B — Remaining European Opening Cohorts

## 1. Batch status

`WAITING_FOR_168H_WINDOW`. Fresh provider data shows that every Premier League, Ligue 1, and Serie A opening fixture remains outside the approved 168-hour horizon. No prediction generation, historical-evidence download, team ingestion, membership write, fixture write, or shadow write was performed.

## 2. Execution and environment

- UTC execution timestamp: `2026-08-11T00:32:08.850Z`
- Environment-derived Development project: `oislplqdvtaajqxbwvut`
- Production accessed: no
- `.env.local`: ignored/untracked; no credential value printed or persisted
- Provider authentication: HTTP 200

## 3. Pre-run database state

| Measure | Before | After | Delta |
|---|---:|---:|---:|
| Shadow runs | 3 | 3 | 0 |
| Shadow predictions | 29 | 29 | 0 |
| Pending | 29 | 29 | 0 |
| Settled | 0 | 0 | 0 |
| Immutable fingerprints | 29 | 29 | 0 |
| Completed historical fixtures | 1,990 | 1,990 | 0 |

All 29 prior prediction fingerprints matched after the audit. Cohort #1 (10), Cohort #2 (15), and La Liga Cohort #3 (4) remain unchanged.

## 4. League readiness

| League | League ID | Season | Opening fixtures inspected | Inside 168h | Eligible | Insufficient-history skips | Already frozen | Newly frozen | Top Picks | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Premier League | 39 | 2026 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | WAITING_FOR_WINDOW |
| Ligue 1 | 61 | 2026 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | WAITING_FOR_WINDOW |
| Serie A | 135 | 2026 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | WAITING_FOR_WINDOW |

Current-season provider identity was verified independently:

- Premier League, England: `current=true`, 2026-08-21 through 2027-05-30, 20 teams, 380 fixtures.
- Ligue 1, France: `current=true`, 2026-08-21 through 2027-05-29, 18 teams, 306 fixtures.
- Serie A, Italy: `current=true`, 2026-08-22 through 2027-05-30, 20 teams, 380 fixtures.

All team payload provider IDs were non-empty and unique within their league. Because no league entered the prediction window, team/membership ingestion was correctly deferred.

## 5. Exact 168-hour findings and exclusions

All 29 inspected fixtures were excluded as `OUTSIDE_168H_WINDOW`.

### Premier League

| Fixture ID | Fixture | Kickoff UTC | Hours at audit | Entry UTC | Reason |
|---|---|---|---:|---|---|
| 1557367 | Arsenal vs Coventry | 2026-08-21T19:00:00Z | 258.464 | 2026-08-14T19:00:00Z | OUTSIDE_168H_WINDOW |
| 1557368 | Hull City vs Manchester United | 2026-08-22T11:30:00Z | 274.964 | 2026-08-15T11:30:00Z | OUTSIDE_168H_WINDOW |
| 1557369 | Everton vs Crystal Palace | 2026-08-22T14:00:00Z | 277.464 | 2026-08-15T14:00:00Z | OUTSIDE_168H_WINDOW |
| 1557370 | Ipswich vs Sunderland | 2026-08-22T14:00:00Z | 277.464 | 2026-08-15T14:00:00Z | OUTSIDE_168H_WINDOW |
| 1557371 | Nottingham Forest vs Leeds | 2026-08-22T14:00:00Z | 277.464 | 2026-08-15T14:00:00Z | OUTSIDE_168H_WINDOW |
| 1557372 | Brentford vs Tottenham | 2026-08-22T16:30:00Z | 279.964 | 2026-08-15T16:30:00Z | OUTSIDE_168H_WINDOW |
| 1557374 | Manchester City vs Bournemouth | 2026-08-23T13:00:00Z | 300.464 | 2026-08-16T13:00:00Z | OUTSIDE_168H_WINDOW |
| 1557373 | Brighton vs Aston Villa | 2026-08-23T13:00:00Z | 300.464 | 2026-08-16T13:00:00Z | OUTSIDE_168H_WINDOW |
| 1557375 | Newcastle vs Liverpool | 2026-08-23T15:30:00Z | 302.964 | 2026-08-16T15:30:00Z | OUTSIDE_168H_WINDOW |
| 1557376 | Fulham vs Chelsea | 2026-08-24T19:00:00Z | 330.464 | 2026-08-17T19:00:00Z | OUTSIDE_168H_WINDOW |

### Ligue 1

| Fixture ID | Fixture | Kickoff UTC | Hours at audit | Entry UTC | Reason |
|---|---|---|---:|---|---|
| 1552733 | Marseille vs Strasbourg | 2026-08-21T18:45:00Z | 258.214 | 2026-08-14T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1552732 | Lens vs Auxerre | 2026-08-22T15:15:00Z | 278.714 | 2026-08-15T15:15:00Z | OUTSIDE_168H_WINDOW |
| 1552734 | Nice vs Lorient | 2026-08-22T18:45:00Z | 282.214 | 2026-08-15T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1552736 | Toulouse vs Lyon | 2026-08-22T18:45:00Z | 282.214 | 2026-08-15T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1552737 | Estac Troyes vs Paris FC | 2026-08-22T18:45:00Z | 282.214 | 2026-08-15T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1552731 | Le Mans vs Stade Brestois 29 | 2026-08-22T18:45:00Z | 282.214 | 2026-08-15T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1552729 | Angers vs Lille | 2026-08-23T13:00:00Z | 300.464 | 2026-08-16T13:00:00Z | OUTSIDE_168H_WINDOW |
| 1552730 | Le Havre vs Monaco | 2026-08-23T15:15:00Z | 302.714 | 2026-08-16T15:15:00Z | OUTSIDE_168H_WINDOW |
| 1552735 | Paris Saint Germain vs Rennes | 2026-08-23T18:45:00Z | 306.214 | 2026-08-16T18:45:00Z | OUTSIDE_168H_WINDOW |

### Serie A

| Fixture ID | Fixture | Kickoff UTC | Hours at audit | Entry UTC | Reason |
|---|---|---|---:|---|---|
| 1550095 | Udinese vs Como | 2026-08-22T16:30:00Z | 279.964 | 2026-08-15T16:30:00Z | OUTSIDE_168H_WINDOW |
| 1550092 | Inter vs Monza | 2026-08-22T16:30:00Z | 279.964 | 2026-08-15T16:30:00Z | OUTSIDE_168H_WINDOW |
| 1550091 | Genoa vs Napoli | 2026-08-22T18:45:00Z | 282.214 | 2026-08-15T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1550093 | Parma vs Cagliari | 2026-08-22T18:45:00Z | 282.214 | 2026-08-15T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1550090 | Frosinone vs Juventus | 2026-08-23T16:30:00Z | 303.964 | 2026-08-16T16:30:00Z | OUTSIDE_168H_WINDOW |
| 1550096 | Venezia vs Lecce | 2026-08-23T16:30:00Z | 303.964 | 2026-08-16T16:30:00Z | OUTSIDE_168H_WINDOW |
| 1550088 | Atalanta vs Sassuolo | 2026-08-23T18:45:00Z | 306.214 | 2026-08-16T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1550094 | Torino vs AC Milan | 2026-08-23T18:45:00Z | 306.214 | 2026-08-16T18:45:00Z | OUTSIDE_168H_WINDOW |
| 1550089 | Bologna vs Lazio | 2026-08-24T16:30:00Z | 327.964 | 2026-08-17T16:30:00Z | OUTSIDE_168H_WINDOW |
| 1550087 | AS Roma vs Fiorentina | 2026-08-24T18:45:00Z | 330.214 | 2026-08-17T18:45:00Z | OUTSIDE_168H_WINDOW |

There were no under-120-minute, started, completed, postponed, cancelled, duplicate, team-identity, membership, probability, or other safe-rejection cases. Promoted-club evidence was intentionally not evaluated because every fixture failed the earlier timing gate.

## 6. Prediction output

No prediction cohort was generated. The new-prediction table is empty. Accordingly:

- New predictions: 0
- Top Picks: 0
- Confidence distribution: none
- Probability vectors evaluated: 0
- Evidence cutoffs created: 0
- New fingerprints created: 0
- Public exposure: 0

## 7. Provider usage

| Endpoint | Requests | Purpose |
|---|---:|---|
| `/status` | 1 | Authentication/quota status |
| `/leagues?id=...` | 3 | Exact league and current-season metadata |
| `/teams?league=...&season=2026` | 3 | Current team identity/count validation |
| `/fixtures?league=...&season=2026` | 3 | Opening fixture identity/timing/status validation |

- Total requests: **10**
- Requests by target league: **3 each**, plus one global status call
- Retries: **0**
- Last provider-reported remaining allowance: **7,481**
- API-Football predictions: 0
- Odds: 0
- Standings: 0
- Statistics: 0
- Injuries: 0
- OpenAI: 0
- Prior-season evidence requests: 0, because no fixture passed the timing gate

## 8. Integrity, tests, and security

- Existing prediction mutations: 0
- Historical row mutations: 0
- Duplicate canonical teams introduced: 0
- Duplicate memberships introduced: 0
- Duplicate fixture predictions: 0
- Invalid probability vectors: 0
- Evidence timing violations: 0
- Prediction timing violations: 0
- Fingerprint mismatches: 0
- Database writes: 0
- Publications/notifications: 0
- Focused tests: **67 passed, 0 failed**
- Complete suite: **240 passed, 0 failed**
- TypeScript: passed
- ESLint: passed
- Production/Vercel-compatible build: passed
- `git diff --check`: passed; only existing LF/CRLF notices
- Exact secret-value scan: 0 matches
- Git worktree remains intentionally dirty with the accumulated uncommitted approved batch work; no commit or push occurred

## 9. Known limitations and next execution

Historical-evidence sufficiency, promoted-team exclusions, memberships, probabilities, confidence, daily ranking, and the second timing gate cannot be meaningfully executed until fixtures enter 168 hours. They remain unchanged and fail-closed.

Recommended next execution times:

1. Ligue 1: `2026-08-14T18:45:00Z`
2. Premier League: `2026-08-14T19:00:00Z`
3. Serie A: `2026-08-15T16:30:00Z`

The next run should start shortly after the relevant UTC boundary, re-fetch fresh metadata/teams/fixtures, then fetch/use comparable prior-season evidence only for the league that has entered the window. No later batch should begin automatically.

4H19B_PREMIER_LEAGUE = WAITING

4H19B_LIGUE1 = WAITING

4H19B_SERIEA = WAITING

NEW_EUROPEAN_PREDICTIONS_FROZEN = 0

TOTAL_SHADOW_PREDICTIONS = 29

PREVIOUS_PREDICTIONS_MODIFIED = 0

HISTORICAL_ROWS_MODIFIED = 0

DUPLICATE_PREDICTIONS = 0

FINGERPRINT_VIOLATIONS = 0

PUBLIC_PREDICTIONS_PUBLISHED = 0

PRODUCTION_ACCESSED = FALSE

READY_FOR_NEXT_BATCH = FALSE
