# Fresh untouched holdout validation — pre-registration

Recorded before loading or evaluating the holdout dataset.

## Frozen systems

Prediction engine: `historical-v1`, unchanged. No weights, formulas, probabilities, features, selection logic, confidence semantics or goal-market logic may change.

Confidence engine: frozen Batch 4H.9 `compact-composite`, unchanged:

`confidence = 0.65 × probability geometry + 0.20 × evidence quantity + 0.10 × directional agreement + 0.05 × expected-goal difference`

`probability geometry = 0.45 × normalized maximum probability + 0.35 × normalized top-two margin + 0.20 × inverse normalized entropy`

`evidence quantity = 0.65 × normalized minimum team history + 0.35 × normalized minimum venue history`

Code normalizations, feature meanings, ranking, deterministic kickoff/provider-ID tie breaking and coefficients are frozen exactly as implemented in `modules/football-confidence/research.ts`.

## Holdout selection

Selected competition-season: Ligue 1, France, provider competition ID 61, type League, season 2024. Locally documented provider dates are 2024-08-16 through 2025-05-29. It was selected before seeing results because it is an established completed European top flight with a conventional 18-team structure, expected full provider coverage, an already verified local mapping that avoids discovery calls, and no prior project persistence or evaluation. It was not selected based on expected model performance.

Acquisition plan: exactly two API-Football requests—`teams?league=61&season=2024` and `fixtures?league=61&season=2024`—through the existing bounded historical ingestion pipeline. Current internal usage before acquisition is 0/30. No automatic retry is authorized. Identity, teams, completed fixtures, stable provider IDs, scores, dates, associations and provenance must pass integrity checks before evaluation.

## Evaluation protocol

Use the existing historical-v1 walk-forward eligibility rule: both teams require at least five prior completed matches. For every target, evidence must have kickoff strictly before the target; target, simultaneous and later fixtures are excluded. Generate frozen v1 probabilities and the frozen confidence score before attaching the actual result. Results remain ephemeral and are neither persisted nor published.

Evaluate exactly these coverage points: 100%, 50%, 40%, 30%, 25%, 20%, 10%.

Pre-registered success levels:

- Minimum: top-20% accuracy materially exceeds full-population accuracy.
- Promising: top 20% reaches at least 60% accuracy and improves Brier and log loss.
- Strong: top 20% reaches at least 65% accuracy, improves Brier and log loss, and has adequate sample size.
- Exceptional secondary result: top 10% reaches at least 70%; its smaller sample remains secondary.

The frozen rule will not be changed after results are observed. Scotland, Premier League, La Liga, Serie A and Bundesliga remain development/research benchmarks and cannot influence this validation.

## Locked holdout result

The single evaluation was run without changing or rerunning the confidence rule. Ligue 1 contained 308 completed fixtures: 306 regular-season fixtures and two relegation-playoff fixtures. The pipeline stored 19 participating teams because the playoff participant is legitimately present. Walk-forward eligibility evaluated 261 fixtures and skipped 47: 45 lacked five prior matches for both teams, one lacked home-team history and one lacked away-team history.

Full population: 141/261 correct, 54.02% accuracy, Brier 0.6011, log loss 1.0060; selections 142 home, 0 draw, 119 away; actual outcomes 122 home, 51 draw, 88 away.

| Coverage | Predictions | Accuracy | Brier | Log loss | Wilson 95% CI |
|---:|---:|---:|---:|---:|---:|
| 100% | 261 | 54.02% | 0.6011 | 1.0060 | 47.96–59.97% |
| 50% | 131 | 59.54% | 0.5621 | 0.9524 | 50.98–67.56% |
| 40% | 104 | 64.42% | 0.5344 | 0.9123 | 54.86–72.96% |
| 30% | 78 | 62.82% | 0.5346 | 0.9100 | 51.73–72.71% |
| 25% | 65 | 64.62% | 0.5185 | 0.8827 | 52.47–75.12% |
| 20% | 52 | 61.54% | 0.5379 | 0.9082 | 47.96–73.53% |
| 10% | 26 | 65.38% | 0.4975 | 0.8479 | 46.22–80.59% |

The primary top-20% comparison improves accuracy by 7.52 percentage points, Brier by 0.0632 and log loss by 0.0978. It satisfies minimum and promising validation. It fails strong validation because accuracy is below 65%, and fails the secondary exceptional criterion because top-10% accuracy is below 70%.

Top-20% selections were 30 home and 22 away, with no draws. Home selections achieved 66.67%; away selections achieved 54.55%. Chronological broad-segment accuracy was 50.0%, 70.0% and 59.09%, so the advantage is not uniformly stable through time. The strongest full-population errors were dominated by favourites whose matches ended in draws, confirming the frozen v1 draw limitation.

## Validation conclusion

Classification: **PROMISING SELECTIVE-PREDICTION SIGNAL — VALIDATED AT PROMISING, NOT STRONG, LEVEL**.

The untouched result preserves a real selective advantage but is materially weaker than the development top-20% estimate of 68.97%. Its Wilson interval is wide and overlaps less impressive outcomes. The rule remains frozen and must not be marketed as a guaranteed accuracy tier. Further confirmation requires another pre-registered untouched competition-season, not modification against Ligue 1.
