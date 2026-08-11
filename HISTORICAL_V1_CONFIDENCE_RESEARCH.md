# Historical-v1 confidence and selective-prediction research

## Hypothesis and safeguards

This experiment asks whether immutable historical-v1 predictions can be ranked by pre-kickoff reliability. It does not alter any v1 probability, weight, feature or selection. All five league-seasons are repeatedly inspected development data; no result is an untouched generalisation claim. Confidence features are created before attaching the actual outcome and use only strict-before-kickoff backtest evidence.

## Confidence features and independent diagnostics

Captured features include maximum/second probability, top-two and top-bottom margins, normalized entropy, concentration, selected class, separate home/away history counts, recent/venue/H2H samples, directional factor agreement, absolute v1 strength difference, and expected-goal difference. Current v1 factors expose only a limited directional agreement count; no unexposed season/recent/defensive agreement was invented.

Maximum probability was the strongest individual signal. Accuracy rose from 41.96% below 40%, 42.19% at 40–44%, 43.82% at 45–49%, 56.08% at 50–54%, 58.60% at 55–59%, 62.73% at 60–64%, 76.71% at 65–69%, to 93.75% above 70% (only 32 matches). Brier and log loss improved in the same direction after 50%. Evidence quantity alone was not useful: its top 20% achieved only 53.79% accuracy, Brier 0.6073 and log loss 1.0190.

## Bounded composite research

Six candidates were evaluated, below the maximum of twelve: maximum probability; probability geometry; evidence only; geometry plus evidence; geometry plus strength; and compact composite. The frozen compact composite is:

`0.65 × geometry + 0.20 × evidence + 0.10 × directional agreement + 0.05 × expected-goal difference`

where geometry is `0.45 × normalized maximum probability + 0.35 × normalized top margin + 0.20 × inverse normalized entropy`; evidence is `0.65 × normalized minimum team history + 0.35 × normalized minimum venue history`. Normalizations are bounded to 0–1 and documented in code.

At top-20% coverage, candidate accuracies were: maximum probability 68.62%, probability geometry 68.97%, evidence only 53.79%, geometry/evidence 68.28%, geometry/strength 67.93%, compact composite 68.97%. Compact composite had the best top-20% Brier/log loss (0.4667/0.8144) and best top-10% accuracy (79.31%).

## Coverage versus quality

| Coverage | Predictions | Accuracy | Brier | Log loss | Wilson 95% CI |
|---:|---:|---:|---:|---:|---:|
| 100% | 1,449 | 50.45% | 0.6052 | 1.0119 | 47.88–53.02% |
| 50% | 725 | 59.17% | 0.5514 | 0.9359 | 55.56–62.69% |
| 40% | 580 | 62.41% | 0.5289 | 0.9040 | 58.40–66.26% |
| 30% | 435 | 64.14% | 0.5112 | 0.8793 | 59.53–68.50% |
| 25% | 362 | 67.13% | 0.4869 | 0.8445 | 62.13–71.76% |
| 20% | 290 | 68.97% | 0.4667 | 0.8144 | 63.42–74.01% |
| 10% | 145 | 79.31% | 0.3644 | 0.6723 | 72.00–85.11% |

Largest tested subsets clearing approximate thresholds: ≥55%: 725/50%; ≥57.5%: 725/50%; ≥60%: 580/40%; ≥62.5%: 435/30%; ≥65%: 362/25%. These are development estimates, not promises.

## League robustness

| League | Top-20% n | Accuracy | Brier | Log loss | Top-10% accuracy |
|---|---:|---:|---:|---:|---:|
| Scotland | 40 | 72.50% | 0.4290 | 0.7637 | 75.00% |
| Premier League | 66 | 68.18% | 0.4734 | 0.8151 | 84.85% |
| La Liga | 66 | 75.76% | 0.4381 | 0.7934 | 81.82% |
| Serie A | 66 | 68.18% | 0.4700 | 0.8151 | 72.73% |
| Bundesliga | 52 | 61.54% | 0.5159 | 0.8762 | 73.08% |

Every league improves at top 20%, but Bundesliga remains materially weaker and uncertainty is wide in Scotland and the 10% samples.

## Selection classes and calibration

Top 20% contains 174 home and 116 away selections, with no draw selections because v1 never selects draws. Home accuracy is 72.41% (Brier 0.4397, log loss 0.7778); away accuracy is 63.79% (Brier 0.5073, log loss 0.8693). The signal is not solely home favourites, but home selections contribute more strongly.

Confidence quintile accuracy from bottom to top is 37.59%, 46.90%, 42.91%, 55.86%, 68.97%. The third quintile breaks strict monotonicity, although the two highest groups separate clearly. Probability calibration shows v1 is weak below 50%, improves above 50%, and appears underconfident at 65%+; the 70%+ bucket is only 32 predictions and must not be overinterpreted.

## Chronological stability and failure analysis

Top-20% quality is not uniformly time-stable. Premier League and La Liga improve late, while Bundesliga moves 60.0% → 76.5% → 50.0% across broad chronological thirds. Scotland declines from 80.0% to 66.7%; Serie A moves 85.7% → 58.3% → 67.9%. Segment samples are small, but the collapses prevent a strong-generalisation classification.

High-confidence failures disproportionately include actual draws because v1 cannot select them. Other recurring pre-match diagnostics are extreme probability geometry generated from strength disparities, sparse early-season evidence, and directional evidence that can agree while omitting structural draw risk. These observations were made after scoring and were not used to alter the frozen formula.

## Scientific conclusion

Classification: **PROMISING SELECTIVE-PREDICTION SIGNAL**.

Historical-v1 can identify a substantially better development subset: 290 top-20% predictions achieved 68.97% accuracy versus 50.45% overall, alongside materially lower Brier and log loss, and all five leagues improved. However, the five datasets have been repeatedly inspected, confidence quintiles are not strictly monotonic, draw risk remains unresolved, and chronological instability is visible. The formula is frozen. The correct next test is one newly acquired untouched competition-season evaluated once without changing the rule.
