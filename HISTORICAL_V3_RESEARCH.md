# 9jaFootballAI historical-v3 research

## Status and protocol

`historical-v3` is a deterministic research model. Historical-v1 remains the frozen benchmark and historical-v2 remains research-only. All five persisted 2024 league-seasons are explicitly development/cross-validation datasets; this batch claims no untouched holdout. Each walk-forward prediction uses completed fixtures with kickoff strictly before the target. Target, simultaneous and later fixtures are excluded before team statistics and league scoring baselines are calculated.

## Model

The selected `overall-blend-6` candidate estimates point-in-time venue rates with six pseudo-matches of shrinkage toward the team's prior overall rate. With `LH` and `LA` denoting prior league home/away goals per match:

- home attack = smoothed home-team home GF / LH
- away defensive weakness = smoothed away-team away GA / LH
- home lambda = LH × home attack × away defensive weakness
- away attack = smoothed away-team away GF / LA
- home defensive weakness = smoothed home-team home GA / LA
- away lambda = LA × away attack × home defensive weakness

Lambdas are bounded to 0.15–5 for numerical safety. Missing venue evidence falls back to prior overall team evidence, then the prior league baseline. These are historical scoring expectations, not event-level xG.

Independent Poisson probabilities are calculated for every scoreline from 0–0 through at least 8–8. The range expands to 14 when needed; residual tail above 1e-7 triggers expansion and the retained matrix is normalized. Home/draw/away, Over 1.5/2.5/3.5 and BTTS are all sums from that same matrix.

## Bounded candidate comparison

Only three interpretable candidates were evaluated:

| Candidate | Accuracy | Brier | Log loss | H/D/A picks |
|---|---:|---:|---:|---:|
| Pure venue Poisson | 48.38% | 0.6311 | 1.0627 | 817/67/565 |
| Overall blend, 3 pseudo-matches | 49.90% | 0.6180 | 1.0366 | 761/34/654 |
| Overall blend, 6 pseudo-matches | 50.59% | 0.6154 | 1.0312 | 720/27/702 |

The six-match blend was frozen because it was best on all three primary aggregate metrics. No further tuning followed. Dixon–Coles was not adopted: fitting a defensible low-score correction point-in-time would require a separate bounded estimation design, while selecting a fixed rho after viewing these results would be arbitrary and potentially leaky.

## 1X2 results

| League | v1 acc/Brier/log loss | v3 acc/Brier/log loss |
|---|---|---|
| Scotland | 51.01% / 0.6074 / 1.0179 | 51.52% / 0.6162 / 1.0402 |
| Premier League | 49.09% / 0.6121 / 1.0199 | 50.30% / 0.6148 / 1.0208 |
| La Liga | 50.30% / 0.6007 / 1.0087 | 50.61% / 0.6097 / 1.0291 |
| Serie A | 52.42% / 0.5912 / 0.9902 | 54.24% / 0.5929 / 0.9954 |
| Bundesliga | 49.43% / 0.6185 / 1.0286 | 45.59% / 0.6511 / 1.0852 |
| Aggregate | 50.45% / 0.6052 / 1.0119 | 50.59% / 0.6154 / 1.0312 |

V3 gains seven correct top picks aggregate but is materially worse on Brier, log loss and cross-league stability. Bundesliga is the clearest regression.

## Draw diagnostics

V3 naturally selected 27 draws and correctly selected 6 of 359 actual draws: precision 22.22%, recall 1.67%, F1 3.11%. Mean draw probability was 23.69% on actual draws and 22.53% otherwise, a weak 1.16-point separation. Scotland and Premier League selected none; La Liga selected 17 with 5 correct; Serie A selected 8 with 1 correct; Bundesliga selected 2 with none correct. V2 remains better at draw selection, although v2 also failed its holdout.

## Goal markets and scoring expectations

| Market | v1 accuracy/Brier | v3 accuracy/Brier | v3 mean / observed |
|---|---|---|---|
| Over 1.5 | 76.26% / 0.1814 | 74.74% / 0.1894 | 74.30% / 76.74% |
| Over 2.5 | 55.28% / 0.2493 | 55.90% / 0.2576 | 51.99% / 53.55% |
| Over 3.5 | 67.49% / 0.2166 | 65.36% / 0.2214 | 32.00% / 31.47% |
| BTTS | 53.49% / 0.2520 | 54.24% / 0.2601 | 48.67% / 54.80% |

V3 expected-goal results: home MAE 0.9700/RMSE 1.2551/bias -0.0607; away MAE 0.9399/RMSE 1.1910/bias +0.0872; total MAE 1.3826/RMSE 1.7345/bias +0.0265. V1 total MAE was 1.3346, so v3 did not improve goal expectation error.

## Confidence and calibration

Experimental tiers use evidence quantity, maximum 1X2 probability, top-two margin and normalized entropy. Results were monotonic aggregate: low 44.69% accuracy/Brier 0.6394; moderate 50.00%/0.6300; strong 63.64%/0.5246. They remain research-only. V3 tends to be overconfident in several 50–79% buckets and produced extreme incorrect probabilities, particularly in Bundesliga; the independent-Poisson strength ratios need stronger calibration/shrinkage before further consideration.

## Scientific conclusion

Classification: **FAILED RESEARCH CANDIDATE**.

The coherent score-distribution architecture is valid and testable, and confidence separation is encouraging. However, this implementation worsens aggregate Brier, log loss, total-goal MAE and most goal-market Brier scores, provides very weak draw selection, and is unstable across leagues. Historical-v1 remains the benchmark. Batch 4H.9 should not tune this same evaluation set and call it validation; any successor should pre-register a limited improvement such as hierarchical attack/defence shrinkage or a properly fitted walk-forward Dixon–Coles correction, then require a newly acquired untouched league-season.
