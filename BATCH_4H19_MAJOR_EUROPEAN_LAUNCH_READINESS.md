# Batch 4H.19 - Major European 2026/27 Launch Readiness

1. **Development Supabase:** verified from the configured URL as `oislplqdvtaajqxbwvut`.
2. **Production accessed:** no.
3. **Shadow runs:** 2 before / 2 after.
4. **Shadow predictions:** 25 before / 25 after.
5. **Prior predictions:** all 25 remained pending, shadow-only, and fingerprint-identical; Cohorts #1 and #2 were not regenerated or modified.
6. **API-Football requests:** 41 total: initial audit 17, corrected simulation rerun 16, narrow Premier League/Ligue 1 recovery 6, metadata recovery 2. Endpoint totals: status 1, leagues 10, teams 10, fixtures 20; retries 0.
7. **Provider allowance:** final response reported 7,371 remaining from a 7,500 daily account allowance. The extra recovery calls were required after a local adapter-boundary error and output truncation; they were not retries or uncontrolled crawling.
8. **Canonical league IDs:** La Liga 140, Premier League 39, Ligue 1 61, Serie A 135.
9. **Season identifiers:** provider season `2026` for all, representing 2026/27.
10. **Teams:** La Liga 20, Premier League 20, Ligue 1 18, Serie A 20.
11. **Fixtures:** La Liga 380, Premier League 380, Ligue 1 306, Serie A 380. Prior-season completed evidence: 380, 380, 309, and 380 respectively.
12. **Opening schedules:** exact provider fixtures are listed below.
13. **168-hour entry times:** calculated as each fixture kickoff minus exactly 168 hours and listed below.
14. **Inside 168 hours at the corrected audit timestamp:** six La Liga fixtures; Premier League, Ligue 1, and Serie A had zero.
15. **Evidence:** immediately preceding 2025 domestic-season results are available. Same-league returning teams require at least five comparable matches; evidence timestamps must remain strictly before prediction creation.
16. **Promoted clubs:** La Liga - Malaga, Deportivo La Coruna, Racing Santander; Premier League - Ipswich, Hull City, Coventry; Ligue 1 - Estac Troyes, Le Mans; Serie A - Frosinone, Venezia, Monza. Opening fixtures involving these teams are tagged `PROMOTED_FROM_LOWER_DIVISION` and skipped as `INSUFFICIENT_COMPARABLE_HISTORY` unless separately comparable evidence is authorized later.
17. **New-season policy:** distinguishes `CURRENT_SEASON`, `SAME_LEAGUE_PRIOR_SEASON`, `PROMOTED_FROM_LOWER_DIVISION`, and `CROSS_COMPETITION_HISTORY`; opening/early/established season phase is private metadata only.
18. **Zero-write candidates:** La Liga 4; Premier League 0; Ligue 1 0; Serie A 0.
19. **Top Picks:** 0. The four-match La Liga population is below the frozen minimum, so none was forced.
20. **Standard candidates:** 4, all La Liga.
21. **Confidence:** STRONG 2, MODERATE 2, LOW 0.
22. **Skipped:** two inside-window La Liga promoted-team fixtures lacked comparable top-flight history; every other opening fixture was outside 168 hours. Unsafe-status, probability, timing, and cutoff violations were zero.
23. **Rolling worker:** implemented server-only with a 168-hour horizon, 120-minute minimum lead, frozen-identity exclusion, global ranking, zero-write mode, and prediction immutability.
24. **Scheduler design:** one future scheduler every six hours -> one locked orchestration worker -> configured leagues -> bounded provider calls -> deduplication -> frozen pipeline -> targeted persistence.
25. **Scheduler activation:** disabled; no cron, Vercel schedule, GitHub Action, or Supabase scheduler was created.
26. **Idempotency:** repeated zero-write runs create no records; frozen fixtures are skipped; an in-process overlap lock rejects concurrent execution.
27. **Fingerprint:** SHA-256 with canonical UTC timestamps remains stable across equivalent timestamp serialization and changes when prediction-defining data changes.
28. **Cohort #1 fingerprints:** unchanged.
29. **Cohort #2 fingerprints:** unchanged.
30. **Migration:** none created or applied for 4H.19; the optional 4H.18 trigger migration remains unapplied.
31. **Public publishing:** disabled; zero public writes or routes created.
32. **Notifications:** zero.
33. **TypeScript:** passed.
34. **ESLint:** passed with generated-output exclusions used by the project script.
35. **Focused tests:** 62 passed before live audit, including 17 new European readiness tests.
36. **Complete suite:** 235 passed, 0 failed.
37. **Production build:** passed.
38. **`git diff --check`:** passed.
39. **Secret scan:** no real credentials found; `.env.local` remained ignored, untracked, unmodified, and undisclosed.
40. **Files changed:** `modules/football-data/domain.ts`, `modules/football-data/api-football-provider.ts`, `modules/football-intelligence/rolling-readiness.ts`, `modules/football-intelligence/index.ts`, `tests/major-european-readiness.test.mjs`, `tests/current-season-acquisition.test.mjs`, the three 4H.19 audit/recovery tools, and this report.
41. **4H.19A recommendation:** run a fresh bounded La Liga-only preflight and second timing/status check, then consider freezing only the four currently comparable fixtures. Continue monitoring exact entry times for the other leagues; do not include promoted-team fixtures without an explicitly approved comparable-evidence policy.

## Canonical competition metadata

| League | ID | Country | Season | Start | End | Teams | Fixtures | Standings | Statistics | Injuries | Predictions metadata | Odds metadata |
|---|---:|---|---:|---|---|---:|---:|---|---|---|---|---|
| LALIGA EA SPORTS | 140 | Spain | 2026 | 2026-08-15 | 2027-05-30 | 20 | 380 | Yes | No | No | Yes, unused | Yes, unused |
| Premier League | 39 | England | 2026 | 2026-08-21 | 2027-05-30 | 20 | 380 | Yes | No | No | Yes, unused | No |
| Ligue 1 | 61 | France | 2026 | 2026-08-21 | 2027-05-29 | 18 | 306 | Yes | No | No | Yes, unused | No |
| Serie A | 135 | Italy | 2026 | 2026-08-22 | 2027-05-30 | 20 | 380 | Yes | No | No | Yes, unused | No |

Coverage fields are informational metadata only. No predictions, odds, standings, statistics, or injuries endpoint was called.

## La Liga opening round

| Fixture | Match | Kickoff UTC | 168h entry UTC | State at audit | Evidence result |
|---|---|---|---|---|---|
| 1570333 | Alaves - Getafe | 2026-08-15 17:30 | 2026-08-08 17:30 | INSIDE_168H | Eligible |
| 1570341 | Sevilla - Rayo Vallecano | 2026-08-15 19:30 | 2026-08-08 19:30 | INSIDE_168H | Eligible |
| 1570339 | Racing Santander - Villarreal | 2026-08-16 15:00 | 2026-08-09 15:00 | INSIDE_168H | Excluded: promoted club |
| 1570338 | Espanyol - Levante | 2026-08-16 17:00 | 2026-08-09 17:00 | INSIDE_168H | Eligible |
| 1570336 | Celta Vigo - Osasuna | 2026-08-16 19:30 | 2026-08-09 19:30 | INSIDE_168H | Eligible |
| 1570337 | Deportivo La Coruna - Elche | 2026-08-17 19:00 | 2026-08-10 19:00 | INSIDE_168H | Excluded: promoted club |
| 1570334 | Atletico Madrid - Malaga | 2026-08-19 19:00 | 2026-08-12 19:00 | OUTSIDE_168H | Promoted club; reassess separately |
| 1570342 | Valencia - Real Betis | 2026-08-25 19:00 | 2026-08-18 19:00 | OUTSIDE_168H | Comparable evidence available |
| 1570340 | Real Madrid - Real Sociedad | 2026-08-26 19:00 | 2026-08-19 19:00 | OUTSIDE_168H | Comparable evidence available |
| 1570335 | Barcelona - Athletic Club | 2026-08-27 19:00 | 2026-08-20 19:00 | OUTSIDE_168H | Comparable evidence available |

### Valid La Liga zero-write output

| Fixture | Prediction | H/D/A | Confidence | Tier | Evidence cutoff |
|---|---|---|---|---|---|
| 1570333 | HOME | 34.78/30.66/34.56 | MODERATE | Standard | 2026-05-24 19:00 UTC |
| 1570341 | AWAY | 31.09/30.23/38.68 | STRONG | Standard | 2026-05-24 19:00 UTC |
| 1570338 | AWAY | 33.82/30.80/35.38 | MODERATE | Standard | 2026-05-24 19:00 UTC |
| 1570336 | HOME | 54.39/26.50/19.11 | STRONG | Standard | 2026-05-24 19:00 UTC |

These are private zero-write readiness results, not persisted predictions or public recommendations.

## Premier League opening round

| Fixture | Match | Kickoff UTC | 168h entry UTC | Evidence |
|---|---|---|---|---|
| 1557367 | Arsenal - Coventry | 2026-08-21 19:00 | 2026-08-14 19:00 | Exclude: promoted |
| 1557368 | Hull City - Manchester United | 2026-08-22 11:30 | 2026-08-15 11:30 | Exclude: promoted |
| 1557369 | Everton - Crystal Palace | 2026-08-22 14:00 | 2026-08-15 14:00 | Comparable |
| 1557370 | Ipswich - Sunderland | 2026-08-22 14:00 | 2026-08-15 14:00 | Exclude: promoted |
| 1557371 | Nottingham Forest - Leeds | 2026-08-22 14:00 | 2026-08-15 14:00 | Comparable |
| 1557372 | Brentford - Tottenham | 2026-08-22 16:30 | 2026-08-15 16:30 | Comparable |
| 1557374 | Manchester City - Bournemouth | 2026-08-23 13:00 | 2026-08-16 13:00 | Comparable |
| 1557373 | Brighton - Aston Villa | 2026-08-23 13:00 | 2026-08-16 13:00 | Comparable |
| 1557375 | Newcastle - Liverpool | 2026-08-23 15:30 | 2026-08-16 15:30 | Comparable |
| 1557376 | Fulham - Chelsea | 2026-08-24 19:00 | 2026-08-17 19:00 | Comparable |

All were outside 168 hours at the recovery audit.

## Ligue 1 opening round

| Fixture | Match | Kickoff UTC | 168h entry UTC | Evidence |
|---|---|---|---|---|
| 1552733 | Marseille - Strasbourg | 2026-08-21 18:45 | 2026-08-14 18:45 | Comparable |
| 1552732 | Lens - Auxerre | 2026-08-22 15:15 | 2026-08-15 15:15 | Comparable |
| 1552734 | Nice - Lorient | 2026-08-22 18:45 | 2026-08-15 18:45 | Comparable |
| 1552736 | Toulouse - Lyon | 2026-08-22 18:45 | 2026-08-15 18:45 | Comparable |
| 1552737 | Estac Troyes - Paris FC | 2026-08-22 18:45 | 2026-08-15 18:45 | Exclude: promoted |
| 1552731 | Le Mans - Stade Brestois 29 | 2026-08-22 18:45 | 2026-08-15 18:45 | Exclude: promoted |
| 1552729 | Angers - Lille | 2026-08-23 13:00 | 2026-08-16 13:00 | Comparable |
| 1552730 | Le Havre - Monaco | 2026-08-23 15:15 | 2026-08-16 15:15 | Comparable |
| 1552735 | Paris Saint Germain - Rennes | 2026-08-23 18:45 | 2026-08-16 18:45 | Comparable |

All were outside 168 hours at the recovery audit.

## Serie A opening round

| Fixture | Match | Kickoff UTC | 168h entry UTC | Evidence |
|---|---|---|---|---|
| 1550095 | Udinese - Como | 2026-08-22 16:30 | 2026-08-15 16:30 | Comparable |
| 1550092 | Inter - Monza | 2026-08-22 16:30 | 2026-08-15 16:30 | Exclude: promoted |
| 1550091 | Genoa - Napoli | 2026-08-22 18:45 | 2026-08-15 18:45 | Comparable |
| 1550093 | Parma - Cagliari | 2026-08-22 18:45 | 2026-08-15 18:45 | Comparable |
| 1550090 | Frosinone - Juventus | 2026-08-23 16:30 | 2026-08-16 16:30 | Exclude: promoted |
| 1550096 | Venezia - Lecce | 2026-08-23 16:30 | 2026-08-16 16:30 | Exclude: promoted |
| 1550088 | Atalanta - Sassuolo | 2026-08-23 18:45 | 2026-08-16 18:45 | Comparable |
| 1550094 | Torino - AC Milan | 2026-08-23 18:45 | 2026-08-16 18:45 | Comparable |
| 1550089 | Bologna - Lazio | 2026-08-24 16:30 | 2026-08-17 16:30 | Comparable |
| 1550087 | AS Roma - Fiorentina | 2026-08-24 18:45 | 2026-08-17 18:45 | Comparable |

All were outside 168 hours at the corrected audit.

## Recovery record

The connection interruption occurred after the full provider audit, adapter correction, valid corrected La Liga zero-write simulation, promoted-team safeguards, rolling worker implementation, and focused tests. The final report had not been created. Recovery executed only the missing six Premier League/Ligue 1 fixture/evidence requests and two metadata-only calls; it did not repeat the full four-league audit.

No European prediction was persisted. No frozen row, settlement field, historical fixture, public report, route, scheduler, environment variable, or notification was changed.

**READY_FOR_4H19A = TRUE**
