# Historical draw structural feature research

## 1. Batch status and research question

Batch 4H.13 is complete as research-only work. It asked whether strictly pre-kickoff historical structure can distinguish a genuine future draw from a superficially balanced fixture that later produces a winner.

**Scientific classification: NO NEW STRUCTURAL DRAW SIGNAL.**

No feature passed the pre-declared acceptance gate, no feature combination was built, no model was fitted, and no candidate was installed or promoted.

## 2. Preservation guarantees

Historical-v1 remains the unchanged operational benchmark. Batch 4H.11 historical-v2, historical-v3, the frozen Batch 4H.9 confidence selector, Batch 4H.10 Ligue 1 results and the failed Batch 4H.12 research remain unchanged. The structural tooling has no persistence, publication, provider or production-model dependency.

## 3. Datasets and partitions

Only persisted API-Football 2024 data from the five previously inspected development competitions was read.

| Competition | Development 55% | Calibration 15% | Locked 30% |
|---|---:|---:|---:|
| Scottish Premiership | 108 | 30 | 60 |
| Premier League | 181 | 49 | 100 |
| La Liga | 181 | 49 | 100 |
| Serie A | 181 | 49 | 100 |
| Bundesliga | 143 | 39 | 79 |
| **Total** | **794** | **216** | **439** |

Development contained 200 draws (25.19%); calibration contained 51 (23.61%). Ligue 1 was not loaded, inspected or scored. The locked 439 were removed from research datasets and were not scored by structural candidates. No external dataset was acquired.

## 4. Point-in-time methodology

For target kickoff `K`, every statistic uses only completed fixtures with `kickoff < K`. Target, simultaneous and later fixtures are excluded. Team, league and season datasets are supplied independently. No final table, season-end average, future frequency, odds, injury, lineup, event or target-score information is used.

Every row retains home/away overall counts, venue counts and recent-window counts. The normal walk-forward eligibility rule supplies at least five previous team matches. Statistics return `null` when mathematically unavailable; deterministic zero is used only for “no previous draw” recency support. No shrinkage was required for the diagnostic table, and no final-season prior was used.

## 5. Frozen draw-like definitions

Thresholds were derived from the 794 development rows and frozen before calibration was opened:

- **DRAW_LIKE_A:** absolute historical-v2 home/away probability gap `<= 0.1453` and historical-v2 draw probability `>= 0.3040`.
- **DRAW_LIKE_B:** v1 strength similarity `>= 0.7880` and expected-goal gap `<= 0.3000`.

Neither definition uses match outcome. Development A contained 227 fixtures/65 draws; B contained 132/33. Calibration A contained 70/17; B contained 46/12.

## 6. Complete implemented feature inventory and formulas

Pair aggregation means the arithmetic mean of home- and away-team point-in-time values unless noted.

| Feature | Formula / interpretation |
|---|---|
| `goalDifferenceVolatility` | Mean team population standard deviation of prior match goal difference. |
| `volatilitySimilarity` | `1 / (1 + abs(home GD std - away GD std))`. |
| `closeGameRate` | Mean proportion of prior matches with absolute goal difference `<= 1`. |
| `decisiveGameRate` | Mean proportion with absolute goal difference `>= 2`; complement of close-game rate. |
| `scorelineConcentration` | Mean Herfindahl concentration `sum(scoreline frequency²)` over exact prior scorelines. |
| `lowDrawConcentration` | Mean prior proportion finishing 0-0 or 1-1. |
| `oneGoalConcentration` | Mean of both teams’ score-exactly-one and concede-exactly-one rates. |
| `recentDrawRate5` | Mean draw fraction in each team’s previous five matches. |
| `drawRecencySupport` | Mean `1/(1 + matches since last draw)`; zero if no previous draw. |
| `recentDecisiveMargin` | Mean absolute goal difference over both teams’ previous five matches. |
| `scoringVariance` | Mean population variance of goals scored and conceded for both teams. |
| `attackDefenceBalanceSimilarity` | `1/(1 + abs(home internal GF/GA gap - away internal GF/GA gap))`. |
| `expectedScorelineConcentration` | `1/(1 + abs(expected home goals-1) + abs(expected away goals-1))`. |
| `lowTotalBalanceShape` | `(1 - clamp(expected total/4)) * v1 strength similarity`. |
| `venueAsymmetry` | Absolute difference between overall pair goal-difference gap and home/away venue-specific gap. |

Supporting raw research also calculates mean/variance/absolute goal difference, within-two-goal rate, goal-total variance, score/concede 0/1/2+ rates, and evidence counts. Opponent-adjusted performance was omitted: reconstructing opponent baselines at every historical sub-kickoff would add substantial nested state and leakage risk without verified incremental need. Support breadth was not created because no independent components passed.

## 7. Development individual-feature diagnostics

All 15 features were available on all 794 rows; missing count was zero. `Δ` is actual-draw mean minus non-draw mean. SMD is standardized mean difference. AUC above .5 means higher feature values align with draws.

| Feature | Overall Δ/SMD/AUC | Draw-like A Δ/SMD/AUC | Draw-like B Δ/SMD/AUC | Decision |
|---|---|---|---|---|
| GD volatility | -.040/-.133/.463 | +.021/+.076/.514 | +.015/+.051/.507 | Reject: sign changes inside balanced fixtures. |
| Volatility similarity | +.010/+.066/.519 | +.005/+.038/.521 | -.012/-.079/.485 | Reject: negligible/reversing. |
| Close-game rate | +.008/+.067/.520 | -.017/-.159/.447 | -.002/-.014/.486 | Reject: balance-subset reversal. |
| Decisive-game rate | -.008/-.067/.480 | +.017/+.159/.552 | +.002/+.014/.514 | Reject: redundant and reversal. |
| Scoreline concentration | -.002/-.050/.490 | +.001/+.018/.496 | +.005/+.140/.538 | Reject: weak. |
| Low-draw concentration | +.003/+.040/.502 | -.016/-.200/.434 | -.006/-.070/.469 | Reject: counter-direction and inconsistent leagues. |
| One-goal concentration | +.001/+.013/.499 | -.016/-.222/.428 | -.008/-.108/.473 | Reject: no aggregate information. |
| Recent draw rate 5 | -.003/-.021/.491 | -.033/-.244/.440 | +.002/+.015/.518 | Reject: effect confined to A and reverses under B. |
| Draw recency support | +.011/+.047/.515 | -.011/-.048/.492 | -.007/-.028/.507 | Reject: negligible. |
| Recent decisive margin | -.042/-.105/.480 | +.072/+.196/.562 | -.015/-.039/.494 | Reject: definition and temporal sign reversal. |
| Scoring variance | -.035/-.101/.472 | +.035/+.114/.533 | +.052/+.163/.541 | Reject: aggregate/subset reversal and mixed leagues. |
| Attack/defence similarity | +.012/+.063/.519 | -.008/-.055/.481 | -.012/-.082/.482 | Reject: weak/reversing. |
| Expected-scoreline concentration | +.010/+.074/.541 | -.012/-.096/.482 | -.013/-.090/.481 | Reject: duplicates expectations and reverses. |
| Low-total balance shape | +.028/+.218/.567 | +.007/+.055/.508 | +.005/+.041/.499 | Reject: only separates obvious mismatches. |
| Venue asymmetry | +.010/+.017/.493 | +.070/+.140/.540 | +.030/+.083/.483 | Reject: weak and league-inconsistent. |

The strongest aggregate feature, low-total balance, loses essentially all discrimination after restricting to already balanced fixtures. This directly confirms the distinction between “draw-like” and “genuine draw-risk”.

## 8. Draw-like true-versus-false, league and chronological robustness

Recent draw rate appeared most interesting inside Draw-like A during development: true draws averaged 3.29 percentage points lower, SMD -.244, AUC .440. Its direction was negative in all five A league slices, but almost zero in the middle and late development thirds and absent in Draw-like B. It therefore failed the gate before calibration.

One-goal concentration was negative in four of five Draw-like A leagues and all three temporal thirds, but its absolute difference was only 1.59 points and aggregate AUC .428; Draw-like B was weaker. Low-draw concentration was negative in four A leagues but changed sign in Scotland and across temporal thirds. Recent decisive margin and scoring variance reversed across development thirds and definitions. Venue asymmetry had mixed league signs.

No feature simultaneously provided non-trivial balanced-fixture separation, consistent direction across both definitions, broad league support and stable thirds. Obvious redundancy pairs were reduced analytically: close/decisive rate are complements; recent-draw fraction and recency support overlap; volatility and scoring variance overlap; scoreline/one-goal/low-draw concentration overlap; expected-scoreline and low-total balance reuse historical expectation geometry.

## 9. Frozen combination decision

The feature gate required reasonable availability, interpretable pre-match construction, non-trivial discrimination specifically inside draw-like fixtures, broad league and temporal consistency, non-redundancy and no narrow threshold dependence. Zero features passed. Under the pre-registered rule requiring at least two accepted features, bounded combinations and logistic diagnostics were not permitted and were not run.

## 10. Once-opened calibration results

Calibration was opened once only after definitions and the no-combination decision were frozen. Several localized directions reversed:

| Feature | Development Draw-like A Δ/SMD | Calibration A Δ/SMD | Calibration B Δ/SMD | Interpretation |
|---|---:|---:|---:|---|
| Recent draw rate 5 | -.0329/-.244 | +.0531/+.383 | +.0338/+.236 | Complete sign reversal. |
| Low-draw concentration | -.0161/-.200 | +.0098/+.173 | +.0204/+.345 | Sign reversal. |
| One-goal concentration | -.0159/-.222 | +.0081/+.135 | +.0205/+.352 | Sign reversal. |
| Recent decisive margin | +.0722/+.196 | -.3040/-.579 | -.3627/-.657 | Large sign reversal. |
| Scoring variance | +.0355/+.114 | -.0218/-.082 | -.1201/-.430 | Sign reversal. |
| Expected-scoreline concentration | -.0124/-.096 | -.0033/-.027 | +.0497/+.354 | Definition-dependent reversal. |

Calibration also showed close-game rate positively associated with draws, but development showed the opposite inside Draw-like A and no effect in B. It cannot be promoted post hoc.

Because no probability candidate existed, there are no candidate draw selections, precision, recall, F1, multiclass scores or calibration probability bins. The appropriate constant-prevalence calibration baseline is `p=51/216=.2361`, binary Brier `.180363`, and binary log loss `.546556`. Claiming improvement without a frozen probability construction would be invalid.

## 11. Failure analysis

The new features describe match shape, but their true-draw and false-balanced distributions overlap heavily. Features with visible development effects are definition-dependent, league-mixed, temporally weak, or reverse on calibration. Recent form appears especially regime-sensitive rather than persistent. Score concentration and low-total structure mostly duplicate the same balance information already captured by v2.

The negative result suggests the persisted final-score-only dataset does not contain stable information about whether a balanced match remains level. More coefficient work on these features would be post-hoc overfitting.

## 12. Anti-leakage and activity audit

Automated tests cover target-score mutation, same-kickoff mutation, later-result mutation, future-fixture removal, league and season isolation, locked-reference exclusion, calibration-outcome independence of development thresholds/features, deterministic repetition, sparse evidence and absence of persistence/publication dependencies.

- API-Football requests: 0
- OpenAI requests: 0
- External datasets: 0
- Database reads: existing five development datasets only
- Database writes: 0
- Historical rows modified: 0
- Predictions persisted: 0
- Predictions published: 0

## 13. Recommendation for Batch 4H.14

Pause historical-final-score-only draw-model development. Do not consume another holdout and do not create a frozen vNext model. Any future draw research should first obtain richer independently justified point-in-time inputs—such as verified event/team statistics, richer xG, lineup and injury context, or commercially acceptable market information—or use a separately pre-registered modelling architecture.

**NO CANDIDATE QUALIFIED FOR EXTERNAL VALIDATION.**
