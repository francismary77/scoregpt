# Batch 4H.18A - Continuous Forward Cohort #2

1. **Batch status:** CONTINUOUS FORWARD COHORT #2 SUCCESSFULLY FROZEN.
2. **Architecture:** Development-only continuous forward shadow evaluation; private, immutable, and unpublished.
3. **Development identity:** configured URL resolved exactly to `oislplqdvtaajqxbwvut`; the database contained the authoritative 4H.17B run and predictions.
4. **Production accessed:** no.
5. **Previous shadow runs:** 1.
6. **Previous shadow predictions:** 10.
7. **Cohort #1 immutability:** all 10 baseline fingerprints matched before generation and remained unchanged after persistence and replay.
8. **Target leagues:** Swedish Allsvenskan, Norwegian Eliteserien, Finnish Veikkausliiga, and Chinese Super League only.
9. **Provider seasons:** all four verified as 2026.
10. **Requests by endpoint:** status 1, teams 8, fixtures 8.
11. **Total provider requests:** 17; no retries; within preferred 20 and hard internal 30 ceilings.
12. **Provider account remaining:** final reliable response header reported 7,411 requests remaining; this is provider metadata, not the internal batch ceiling.
13. **Season fixtures returned:** 852 across the four provider fixture responses.
14. **Fixtures in 168-hour window:** 29 total; 19 new after duplicate exclusion.
15. **Already frozen:** 10 Cohort #1 fixture identities excluded before generation.
16. **Invalid fixtures:** 0.
17. **Insufficient history:** 0 among the 19 new candidates.
18. **New eligible predictions:** 19.
19. **Zero-write proposal:** 15 selected from 19; exact table below.
20. **Probability validation:** all vectors within [0,1], normalized within production tolerance, and deterministically selected.
21. **Evidence cutoff:** 0 violations; every cutoff strictly precedes creation.
22. **Prediction timing:** 0 violations; second-gate minimum lead was 6,521 minutes.
23. **Eligible confidence distribution:** STRONG 8, MODERATE 6, LOW 5.
24. **Eligible tier distribution:** TOP_PICK 3, STANDARD_ANALYSIS 16, LIMITED_EVIDENCE 0.
25. **Top Picks:** Mariehamn-SJK, Kalmar-Hammarby, and Brann-Ham-Kam.
26. **Second freshness:** all 15 retained exact fixture/league/season/team/kickoff identities and remained scheduled with at least 120 minutes.
27. **Final cohort:** 15 predictions across all four leagues and three UTC fixture dates.
28. **New run:** `shadowrun_20260810T221803419Z`.
29. **Predictions persisted:** 15.
30. **Exact cohort:** table below.
31. **Cohort #1:** 10 rows before and 10 after; immutable fields and fingerprints unchanged.
32. **Total shadow rows:** 10 before, 25 after.
33. **Duplicate canonical identities:** 0.
34. **Fingerprints:** initial insert comparison exposed equivalent `Z` versus `+00:00` timestamp serialization. Hashing now canonicalizes timestamps to ISO UTC; read-back produced 15 unique verified SHA-256 fingerprints without changing prediction data.
35. **Shadow state:** all 15 are `SHADOW_ONLY` with `shadow_mode=true`.
36. **Settlement:** all 15 are `PENDING` with no scores, outcome, correctness, or settlement timestamp.
37. **Anonymous access:** denied with HTTP 401; RLS/revokes unchanged.
38. **Historical rows modified:** 0; completed historical fixtures remained 1,990.
39. **Public prediction writes:** 0; the one unrelated pre-existing public report remained unchanged.
40. **Public routes:** 0.
41. **Notifications:** 0 email, Telegram, WhatsApp, push, webhook, or social actions.
42. **OpenAI:** 0 requests.
43. **API-Football Predictions:** 0 requests.
44. **Odds:** 0 requests.
45. **Cohort #2 schedule:** table below; first checks are kickoff +120 minutes.
46. **Combined schedule:** compact Cohort #1 and #2 schedule follows.
47. **Earliest next settlement check:** 14 August 2026 at 13:35 UTC for Cohort #1 fixtures 1523235 and 1523236.
48. **Settled observations:** 0.
49. **Performance:** 25 total, 25 pending, 0 settled; accuracy, Brier score, log loss, tier accuracy, confidence accuracy, and league accuracy are N/A.
50. **Result leakage:** automated tests prove supplying a later target result cannot change frozen probabilities, selection, confidence, tier, evidence cutoff, methodology, or fingerprint.
51. **Replay:** provider-free live repository replay reused 15/15 identities, created 0 rows, created 0 runs, and left the count at 25.
52. **TypeScript:** passed.
53. **ESLint:** passed using the project exclusions for generated `dist` and `.next`.
54. **Focused tests:** 48 passed before persistence; settlement/cohort replay coverage included.
55. **Complete suite:** 218 passed, 0 failed after persistence.
56. **Production build:** passed.
57. **`git diff --check`:** passed.
58. **Secret scan:** no real secrets found; the known token-like CSS false positive was excluded after review.
59. **`.env.local`:** ignored, untracked, unmodified, and never printed.
60. **Migration:** none applied; the reviewed 4H.18 additive immutability migration remains unapplied and was not necessary for safe inserts.
61. **Rollback:** none required; no unexpected or partial writes occurred.
62. **Commit:** none.
63. **Push:** none.
64. **Deployment:** none.
65. **Known limitation:** no forward fixture has completed, so performance remains observationally unavailable; database-level immutability trigger still awaits separate approval/application.
66. **Next step:** wait for the earliest due settlement check, continue forward generation and settlement as separate tracks, and do not begin Batch 4H.19 without authorization.

## Cohort #2 zero-write and persisted cohort

| Fixture | Competition | Home | Away | Kickoff UTC | Prediction | H/D/A | Confidence | Tier | Earliest check UTC |
|---|---|---|---|---|---|---|---|---|---|
| 1523238 | Chinese Super League | Shenyang Urban | Sichuan Jiuniu | 2026-08-15 11:00 | HOME | 41.46/28.49/30.05 | STRONG | Standard | 2026-08-15 13:00 |
| 1523240 | Chinese Super League | Hangzhou Greentown | Chengdu Better City | 2026-08-15 11:35 | AWAY | 31.28/30.10/38.62 | MODERATE | Standard | 2026-08-15 13:35 |
| 1523239 | Chinese Super League | Tianjin Teda | Beijing Guoan | 2026-08-15 11:35 | AWAY | 33.35/31.20/35.45 | LOW | Standard | 2026-08-15 13:35 |
| 1523242 | Chinese Super League | Yunnan Yukun | Dalian Zhixing | 2026-08-15 12:00 | HOME | 36.16/29.83/34.01 | MODERATE | Standard | 2026-08-15 14:00 |
| 1523241 | Chinese Super League | Shanghai Shenhua | Henan Jianye | 2026-08-15 12:00 | HOME | 35.16/30.76/34.08 | LOW | Standard | 2026-08-15 14:00 |
| 1494736 | Norwegian Eliteserien | KFUM Oslo | Lillestrom | 2026-08-15 14:00 | AWAY | 30.30/28.63/41.07 | STRONG | Standard | 2026-08-15 16:00 |
| 1495760 | Finnish Veikkausliiga | Mariehamn | SJK | 2026-08-15 16:00 | AWAY | 21.35/27.37/51.28 | STRONG | Top Pick | 2026-08-15 18:00 |
| 1494242 | Swedish Allsvenskan | Degerfors IF | IFK Goteborg | 2026-08-16 12:00 | AWAY | 23.42/27.69/48.89 | STRONG | Standard | 2026-08-16 14:00 |
| 1495758 | Finnish Veikkausliiga | Lahti | KuPS | 2026-08-16 14:00 | AWAY | 24.40/28.57/47.03 | MODERATE | Standard | 2026-08-16 16:00 |
| 1495759 | Finnish Veikkausliiga | AC Oulu | Inter Turku | 2026-08-16 14:00 | AWAY | 25.97/28.82/45.21 | MODERATE | Standard | 2026-08-16 16:00 |
| 1494247 | Swedish Allsvenskan | Kalmar FF | Hammarby FF | 2026-08-16 14:30 | AWAY | 18.74/25.60/55.66 | STRONG | Top Pick | 2026-08-16 16:30 |
| 1494734 | Norwegian Eliteserien | Brann | Ham-Kam | 2026-08-16 15:00 | HOME | 49.20/26.99/23.81 | STRONG | Top Pick | 2026-08-16 17:00 |
| 1494737 | Norwegian Eliteserien | Molde | Tromso | 2026-08-16 15:00 | AWAY | 22.84/27.23/49.93 | STRONG | Standard | 2026-08-16 17:00 |
| 1494735 | Norwegian Eliteserien | Fredrikstad | Kristiansund BK | 2026-08-16 17:15 | HOME | 44.77/28.01/27.22 | MODERATE | Standard | 2026-08-16 19:15 |
| 1495762 | Finnish Veikkausliiga | Gnistan | Ilves | 2026-08-17 15:00 | HOME | 41.61/29.29/29.10 | STRONG | Standard | 2026-08-17 17:00 |

Nigeria display time is UTC +1 for every row. All current settlement states are `PENDING`.

## Combined Cohort #1 + Cohort #2 settlement schedule

| Cohort | Provider fixtures | Kickoff window UTC | First check window UTC | Count | State |
|---|---|---|---|---:|---|
| #1 | 1523235, 1523236, 1523237, 1495757, 1494738, 1494244 | 2026-08-14 11:35-17:00 | 2026-08-14 13:35-19:00 | 6 | PENDING |
| #1 | 1494248 | 2026-08-15 13:00 | 2026-08-15 15:00 | 1 | PENDING |
| #2 | 1523238, 1523240, 1523239, 1523242, 1523241, 1494736, 1495760 | 2026-08-15 11:00-16:00 | 2026-08-15 13:00-18:00 | 7 | PENDING |
| #1 | 1495761, 1494739 | 2026-08-16 13:00-15:00 | 2026-08-16 15:00-17:00 | 2 | PENDING |
| #2 | 1494242, 1495758, 1495759, 1494247, 1494734, 1494737, 1494735 | 2026-08-16 12:00-17:15 | 2026-08-16 14:00-19:15 | 7 | PENDING |
| #2 | 1495762 | 2026-08-17 15:00 | 2026-08-17 17:00 | 1 | PENDING |
| #1 | 1494246 | 2026-08-17 17:00 | 2026-08-17 19:00 | 1 | PENDING |

No pending prediction is counted as a win or loss. No model tuning, public publication, or result feedback occurred.
