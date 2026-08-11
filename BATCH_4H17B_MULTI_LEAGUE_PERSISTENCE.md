# Batch 4H.17B - First bounded multi-league shadow persistence

1. **Status:** completed successfully in Development shadow mode.
2. **Architecture:** bounded multi-league cohort; no public publishing.
3. **Development project reference:** exact match `oislplqdvtaajqxbwvut` (lowercase `l`).
4. **Production Supabase accessed:** no.
5. **Pre-run shadow predictions:** 0.
6. **Pre-run shadow runs:** 0.
7. **Private-access gate:** RLS/revokes present; anonymous REST access returned HTTP 401.
8. **Approved competitions:** Allsvenskan 113, Eliteserien 103, Veikkausliiga 244, Chinese Super League 169; all season 2026.
9. **Excluded competitions:** J1 League and every non-allowlisted league.
10. **Fresh zero-write provider requests:** 9 (status plus teams and fixtures for four leagues).
11. **Fresh pre-persistence provider requests:** 8 (teams and fixtures for four leagues).
12. **Total Batch provider requests:** 17; retries 0; within preferred 20 and hard 30 ceilings.
13. **Forbidden endpoints:** predictions 0, odds 0, standings 0, injuries 0, statistics 0.
14. **OpenAI requests:** 0.
15. **Fresh fixtures in seven-day window:** 29.
16. **Eligible predictions:** 29; skips 0.
17. **Full daily-global result:** 4 Top Picks and 25 standard analyses.
18. **Confidence distribution:** 11 Strong, 10 Moderate, 8 Low.
19. **Selected cohort:** 10 predictions spanning four leagues and multiple dates.
20. **First timing gate:** passed for all selected fixtures.
21. **Second timing gate:** passed immediately before persistence.
22. **Minimum second-gate lead:** 5,268 minutes.
23. **Evidence gate:** every persisted cutoff precedes prediction creation.
24. **Cohort gate:** 10 predictions and four competitions; minimums satisfied.
25. **Run ID:** `shadowrun_20260810T194650130Z`.
26. **Shadow runs persisted:** 1.
27. **Shadow predictions persisted:** 10.
28. **Persisted fixture IDs:** 1523235, 1494738, 1523237, 1495757, 1494244, 1523236, 1494248, 1495761, 1494739, 1494246.
29. **Competitions represented:** China, Norway, Finland, Sweden.
30. **Methodology:** `historical-v1-frozen-4h`.
31. **Confidence version:** `compact-composite-4h9`.
32. **Publishing policy:** `selective-publishing-4h14`.
33. **Operational state:** all rows `SHADOW_ONLY`; all rows `shadow_mode=true`.
34. **Settlement state:** all rows `PENDING`; no outcome or settlement fields populated.
35. **Duplicate canonical identities:** 0.
36. **Invalid persisted rows:** 0.
37. **Probability validation:** all values in range and normalized.
38. **Foreign identity validation:** all fixtures, teams, and competitions resolved.
39. **Competition enablement:** all four inserted identity records remain disabled.
40. **Historical fixtures:** 1,990 completed rows remain intact.
41. **Public publishing/routes/rows:** none created.
42. **Notifications:** email 0, Telegram 0, WhatsApp 0, push 0, webhook 0, social 0.
43. **Post-write anonymous access:** denied with HTTP 401.
44. **TypeScript:** passed before and after persistence.
45. **ESLint:** passed before and after persistence.
46. **Automated tests:** 190 passed, 0 failed.
47. **Production/Vercel-compatible build:** passed.
48. **`git diff --check`:** passed.
49. **Secret scan:** no API-Football, Supabase service-role, OpenAI, JWT, or real token values found in current tracked content; history heuristic false positive was minified CSS text.
50. **`.env.local`:** ignored, untracked, unmodified, and not exposed.
51. **Commit/push/deploy:** none.
52. **Rollback required:** no.
53. **Partial persistence:** no.
54. **Next action:** review this first bounded shadow cohort; do not publish or settle it automatically.
