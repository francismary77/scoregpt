# Historical-v2 draw model — pre-registration and research record

## Purpose and motivation

Historical-v1 is immutable and remains the benchmark. The frozen Batch 4H.9 confidence selector is also immutable. Batch 4H.10 validated selective ranking on Ligue 1 but exposed v1's zero-draw selection: 51 eligible Ligue 1 fixtures were draws and several strongest favourite errors finished level. Historical-v2 is a separate experimental probability layer intended to identify structurally draw-like fixtures without discarding v1's home/away ordering.

## Dataset inventory and separation

| Role | Country / competition | Provider ID | Season | Teams | Completed | v1 eligible | Actual H/D/A | Safe for v2 development |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Development | Scotland / Premiership | 179 | 2024 | 15 | 234 | 198 | 94/40/64 | Yes |
| Development | England / Premier League | 39 | 2024 | 20 | 380 | 330 | 138/78/114 | Yes |
| Development | Spain / La Liga | 140 | 2024 | 20 | 380 | 330 | 146/83/101 | Yes |
| Development | Italy / Serie A | 135 | 2024 | 20 | 380 | 330 | 133/89/108 | Yes |
| Development | Germany / Bundesliga | 78 | 2024 | 19 | 308 | 261 | 100/69/92 | Yes |
| Excluded holdout | France / Ligue 1 | 61 | 2024 | 19 | 308 | 261 | 122/51/88 | No |

The five development leagues supply 1,449 eligible walk-forward observations, so no provider acquisition is justified. Ligue 1 will not be loaded into v2, scored by v2, used for diagnostics, or used for model selection in this batch.

## Chronological development protocol

For each development league, eligible v1/v2 predictions are ordered by kickoff and stable provider fixture ID. The earliest 70% form parameter-development data; the latest 30% form internal validation. All underlying match features remain strict-before-kickoff. Candidate design, weights and selection use only the early partition. The selected candidate is frozen before the later partition is inspected. Validation coverage therefore spans every league rather than allowing one competition to dominate.

## Pre-registered baselines

- A: never select draw.
- B: point-in-time/unconditional league draw prevalence for probability context only.
- C: frozen historical-v1.

## Candidate feature families

Draw research is limited to pre-kickoff v1 strength proximity, expected-goal closeness, low expected total, home/away probability balance, normalized entropy, overall/recent/venue draw propensity and small interpretable interactions. Missing inputs use neutral bounded values. No future draw frequency, final table or target result is available to the feature calculation.

## Pre-registered advancement criteria

Minimum advancement requires all of:

1. Non-zero and meaningful validation draw selections.
2. Validation draw precision at least five percentage points above validation draw prevalence.
3. Overall validation accuracy no more than one percentage point below v1.
4. Multiclass Brier worsening no greater than 0.005.
5. Log-loss worsening no greater than 0.01.
6. Higher draw-probability bins generally show higher actual draw rates.
7. Useful draw behavior in at least three development competitions.
8. Strict point-in-time leakage tests pass.

Strong advancement requires validation accuracy at least v1, lower Brier, lower log loss, draw precision at least 35%, draw recall at least 10%, and correctly predicted draws in at least three competitions.

These criteria and the 70/30 split are frozen before candidate fitting and internal-validation inspection.

## Development-only model selection

The earliest 70% supplied 1,010 observations and 251 draws (24.85%). Twelve explicit, bounded candidates were evaluated. Broadly aggressive candidates selected too many draws. A final, pre-validation three-point intercept check selected `conservative-2.5`; the neighbouring `-2.6` and `-2.7` variants lost most useful recall. The frozen candidate produced 109 draw selections, 33 correct draws, 30.28% draw precision, 13.15% draw recall, 49.11% accuracy, 0.607861 multiclass Brier and 1.015714 log loss on development data.

Aggregate development diagnostics found no missing feature values. Strength proximity and v1 probability balance were the clearest draw separators. Expected-goal closeness and historical draw propensity were weak or non-monotonic, while low expected goals and the proximity/low-goal interaction were useful only in some leagues. This mixed cross-league behaviour is why the model remains experimental and deliberately conservative.

## Once-opened internal validation

The frozen model was evaluated exactly once on the latest 30% from each of the five development leagues. Ligue 1 was neither loaded nor scored. V1 and v2 used the same 439 fixture identities.

| Metric | Frozen v1 | Frozen v2 |
|---|---:|---:|
| Accuracy | 51.25% | 51.25% |
| Multiclass Brier | 0.600357 | 0.600786 |
| Log loss | 1.003064 | 1.005386 |
| Actual draws | 108 | 108 |
| Predicted draws | 0 | 51 |
| Correct draws | 0 | 17 |
| Draw precision | n/a | 33.33% |
| Draw recall | 0.00% | 15.74% |
| Draw F1 | n/a | 21.38% |

Validation draw prevalence was 24.60%, so v2 precision exceeded prevalence by 8.73 percentage points. V2 selected and correctly identified draws in every development league: Scotland 2/7, England 2/10, Spain 5/16, Italy 6/12 and Germany 2/6. It converted 23 v1 home selections and 28 v1 away selections into draws; each conversion group preserved the same number of correct top picks overall, explaining the unchanged aggregate accuracy.

Draw-probability calibration was imperfect. The five ascending bins had observed draw rates of 21.48%, 26.13%, 23.24%, 34.00% and 0% (the final bin contained only one fixture). The broad movement is directionally useful, especially below 30% versus 35–40%, but is not monotonic and high-bin evidence is sparse. This is a documented limitation rather than a reason to retune after validation.

The frozen Batch 4H.9 confidence selector was applied unchanged to v2. Accuracy rose as coverage narrowed: 60.45% at 50% coverage, 63.64% at 40%, 65.91% at 30%, 71.59% at 20% and 77.27% at 10%. No draw selection entered the top 50% confidence slice, showing that the confidence formula continues to rank decisive predictions above the experimental draw selections.

## Advancement decision

Historical-v2 passes the minimum experimental gate: meaningful draw selection, precision more than five points above prevalence, no accuracy loss, Brier/log-loss changes within tolerance, useful draw behaviour in all five leagues and strict point-in-time safeguards. The pre-registered "generally higher" calibration criterion is met only in the broad relationship between low and 35–40% bins; it is not ordered bin-by-bin. Accordingly the model is classified as **promising experimental**, not production-ready.

It does not pass the strong gate: Brier and log loss are slightly worse than v1, draw precision is below 35%, and calibration is not monotonic. Historical-v1 and the frozen confidence formula remain the operational benchmark. Ligue 1 remains an untouched holdout asset and must not be used to promote or tune v2 in this batch.
