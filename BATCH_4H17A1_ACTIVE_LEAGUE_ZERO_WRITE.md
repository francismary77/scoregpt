# Batch 4H.17A.1 — Active League Zero-Write Report

Execution date: 2026-08-10 (UTC). This is private engineering output. It is not current public intelligence and was not persisted or published.

## Discovery

| Priority | Candidate | Country | Provider ID | Identity | Current season | Current | Start | End | 72h | 168h | Historical evidence | Source | Decision | Reason |
|---:|---|---|---:|---|---:|---|---|---|---:|---:|---|---|---|---|
| 1 | Swedish Allsvenskan | Sweden | 113 | Verified: Allsvenskan, League | 2026 | true | 2026-04-04 | 2026-11-29 | 2 | 2 | Yes, in memory | API-Football 2025 season, 242 completed scored fixtures | Selected | First fully qualified league in the approved order |

No lower-priority candidate was queried after Allsvenskan passed. Scottish Premiership configuration and its persisted 2024 development history were untouched.

## Genuine future fixtures

| Fixture ID | Competition | Season | Kickoff UTC | Home | Away | Status | Identity | Home history | Away history | Cutoff | Eligible | Skip reason | Generated |
|---:|---|---:|---|---|---|---|---|---|---|---|---|---|---|
| 1494239 | Allsvenskan | 2026 | 2026-08-10T17:00:00.000Z | Sirius (370) | IF Brommapojkarna (371) | scheduled | Valid | At least 5 | At least 5 | Valid | Yes | — | Yes |
| 1494240 | Allsvenskan | 2026 | 2026-08-10T17:00:00.000Z | Vasteras SK FK (2241) | Djurgardens IF (364) | scheduled | Valid | Below gate for one or both teams | Below gate for one or both teams | Valid | No | INSUFFICIENT_HISTORY | No |

Exact per-team counts were not retained by the initial in-memory runner. A single no-retry diagnostic re-read was consumed, but its local PowerShell wrapper incorrectly treated the provider's `errors` container as non-empty before calculating the counts. No further request was made. The frozen gate result remains reproducible: fixture 1494239 passed the minimum-five rule and fixture 1494240 did not.

## Private prediction proposal

| Fixture | Competition | Season | Kickoff UTC | Home | Away | prediction_created_at | evidence_cutoff_at | Home | Draw | Away | Selection | Internal confidence | Label | Tier | Rank | Top Pick | History | Persistence |
|---:|---|---:|---|---|---|---|---|---:|---:|---:|---|---:|---|---|---:|---|---|---|
| 1494239 | Allsvenskan | 2026 | 2026-08-10T17:00:00.000Z | Sirius | IF Brommapojkarna | 2026-08-10T15:42:57.833Z | 2026-08-10T15:42:57.833Z | 0.5508 | 0.2562 | 0.1930 | home | 0.6455187466946402 | STRONG | STANDARD_ANALYSIS | 1 | No | both ≥5; latest evidence strictly before creation | ZERO_WRITE / NOT_PERSISTED |

The vector is finite, bounded and sums to 1.0000. One eligible fixture on 2026-08-10 produces a Top-Pick allocation of 0 because the frozen minimum population is five.

## Provider request audit

Nine requests were consumed by this batch: three in the first safely halted pass, five in the corrected complete pass, and one no-retry evidence-depth diagnostic. The database ledger was not mutated and therefore remains at 6; actual known usage for 2026-08-10 is 15 against the internal ceiling of 30.

| Batch # | Purpose | Endpoint class | Competition | Season | HTTP | Records | Rate remaining | Retry | Allowed |
|---:|---|---|---|---:|---:|---:|---:|---|---|
| 1 | Current identity | `/leagues?country=Sweden&current=true` | Allsvenskan | 2026 | 200 | 16 country rows | not retained | No | Yes |
| 2 | 72h fixtures | `/fixtures?league=113&season=2026&from=2026-08-10&to=2026-08-13` | Allsvenskan | 2026 | 200 | 2 | not retained | No | Yes |
| 3 | Current teams | `/teams?league=113&season=2026` | Allsvenskan | 2026 | 200 | 16 | not retained | No | Yes |
| 4 | Current identity replay | `/leagues?country=Sweden&current=true` | Allsvenskan | 2026 | 200 | 16 | 7491 | No | Yes |
| 5 | 72h fixture replay | `/fixtures?league=113&season=2026&from=2026-08-10&to=2026-08-13` | Allsvenskan | 2026 | 200 | 2 | 7490 | No | Yes |
| 6 | Team replay | `/teams?league=113&season=2026` | Allsvenskan | 2026 | 200 | 16 | 7489 | No | Yes |
| 7 | Full season metadata | `/leagues?id=113` | Allsvenskan | 2026/2025 | 200 | 1 | 7494 | No | Yes |
| 8 | In-memory evidence | `/fixtures?league=113&season=2025` | Allsvenskan | 2025 | 200 | 242 | 7493 | No | Yes |
| 9 | Evidence-depth diagnostic | `/fixtures?league=113&season=2025` | Allsvenskan | 2025 | 200 | not retained by local wrapper | unavailable | No | Yes |

No API-Football Predictions, odds, standings, statistics, injuries, lineups, or results-specific endpoint was called.

## Required numbered report

1. **Status:** READY FOR HUMAN REVIEW BEFORE FIRST SHADOW PERSISTENCE.
2. **Architecture:** active-league discovery + historical-evidence readiness + zero-write forward shadow validation.
3. **Files created:** `modules/football-intelligence/active-league-zero-write.ts`, `tools/batch-4h17a1-zero-write.mjs`, `tests/active-league-zero-write.test.mjs`, this report.
4. **Files modified:** `modules/football-data/api-football-provider.ts`.
5. **Development Supabase reference:** verified as `oislplqdvtaajqxbwvut`.
6. **Production Supabase accessed:** no.
7. **API-Football authentication:** accepted; direct API-Sports adapter remained operational.
8. **API-Football requests:** 9 in this batch; actual known daily total 15.
9. **Preferred ceiling:** 15; respected.
10. **Hard ceiling:** 25; respected.
11. **Retries:** 0 automatic retries. The corrected full run was an intentional rerun after a local season-metadata design stop.
12. **Candidates checked:** Swedish Allsvenskan only.
13. **League IDs:** 113.
14. **Current seasons:** 2026.
15. **Current flags:** true.
16. **Season dates:** 2026-04-04 through 2026-11-29.
17. **Fixtures returned:** Allsvenskan 2.
18. **Inside 72h:** 2.
19. **Inside 168h:** 2; no extension request was necessary.
20. **Selected competition:** Swedish Allsvenskan / provider Allsvenskan.
21. **Selection reason:** first approved deterministic candidate passing identity, season, fixture and team gates.
22. **Current teams:** 16.
23. **Identity validation:** passed; both fixtures reference current-season members and distinct teams.
24. **Historical evidence already persisted:** no Allsvenskan rows found.
25. **Historical season inspected:** verified 2025, immediately preceding completed season.
26. **Historical fixtures:** 242 completed, scored, pre-cutoff fixtures in memory.
27. **Historical requests:** 2 successful reads plus 1 diagnostic re-read; 3 total.
28. **Historical evidence persisted:** no.
29. **Historical rows written:** 0.
30. **Existing historical rows modified:** 0.
31. **Future fixtures evaluated:** 2.
32. **Eligible fixtures:** 1.
33. **Ineligible fixtures:** 1.
34. **Reason:** INSUFFICIENT_HISTORY.
35. **Predictions generated:** 1.
36. **Proposal:** shown in the private table above.
37. **Probability integrity:** passed; finite, bounded, normalized.
38. **Timing integrity:** passed; creation was strictly before kickoff.
39. **Evidence cutoff:** passed by frozen input filtering and regression coverage.
40. **Historical-v1:** unchanged, `historical-v1-frozen-4h`.
41. **Confidence:** unchanged, `compact-composite-4h9`.
42. **Selective publishing:** unchanged, `selective-publishing-4h14`.
43. **Research isolation:** passed; runtime has no v2/v2.1/v3/draw-research dependency.
44. **Tier distribution:** STANDARD_ANALYSIS 1; TOP_PICK 0; LIMITED_EVIDENCE 0 generated records; one fixture skipped pre-classification.
45. **Label distribution:** STRONG 1.
46. **Top-Pick population:** 2026-08-10 = 1 eligible.
47. **Top Picks:** 0.
48. **Top-Pick fixture IDs:** none.
49. **Determinism:** identical on repeat and reordered inputs.
50. **Shadow predictions before:** 0.
51. **Shadow predictions after:** 0.
52. **Shadow runs before:** 0.
53. **Shadow runs after:** 0.
54. **Real shadow predictions persisted:** 0.
55. **Public predictions:** 0.
56. **Public routes:** 0.
57. **Notifications:** 0.
58. **Predictions endpoint requests:** 0.
59. **Odds endpoint requests:** 0.
60. **OpenAI requests:** 0.
61. **TypeScript:** passed, 0 errors.
62. **ESLint:** passed, 0 errors and 0 warnings.
63. **Focused tests:** 55 passed, 0 failed, 0 skipped.
64. **Complete tests:** 184 passed, 0 failed, 0 skipped.
65. **Build:** production/Vercel-compatible `vinext build` passed.
66. **`git diff --check`:** passed; only pre-existing LF-to-CRLF working-copy notices were emitted.
67. **Secret scan:** passed; no configured credential value matched a tracked file. Four expected placeholder-name references remain in `.env.example`, documentation and tests, without values.
68. **`.env.local`:** ignored, untracked, undisplayed, unmodified.
69. **Commit:** none.
70. **Push/deploy:** none.
71. **Known limitations:** Allsvenskan evidence is memory-only; exact per-team counts were not retained; only two fixtures existed; Vasteras/Djurgardens was insufficient; request-ledger DB remains 6 while actual known daily use is 15 because zero-write was preserved.
72. **Persistence gate:** closed. No historical or prediction persistence is authorized.
73. **Recommendation for 4H.17B:** human-review fixture 1494239 and explicitly authorize a single bounded shadow persistence only if the exact evidence-depth limitation is accepted or resolved provider-free; do not persist 1494240.
