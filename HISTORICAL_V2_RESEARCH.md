# 9jaFootballAI historical-v2 research protocol

This split was fixed before historical-v2 parameter search:

- Development: Scottish Premiership 2024, Premier League 2024, La Liga 2024
- Validation/model selection: Serie A 2024
- Untouched final holdout: Bundesliga 2024

Bundesliga may be evaluated exactly once after candidate features, parameters, calibration and confidence rules are frozen. It must not influence candidate search or selection. All evaluation uses the existing five-prior-match rule and strict point-in-time fixture cutoffs.

Primary selection order is lower validation multiclass Brier score, then lower log loss, useful draw discrimination, calibration, cross-development stability and finally accuracy. `historical-v1` remains immutable and available as the control model. Historical data, research outputs and any future model result are development evidence, not guaranteed future betting performance.

## Frozen research candidate

The bounded deterministic search evaluated 144 candidates. The frozen candidate uses season strength (0.8), goal balance (0.2), no recent-form, venue-form or H2H weight, decisive scale 2.5, draw intercept -2, strength-similarity weight 1, point-in-time draw-rate weight 0.8, low-goal weight 0.4 and temperature 1.0. Draw probability is a logistic function of pre-match strength similarity, point-in-time team draw rates, the historical low-goal environment and expected-score closeness. Remaining probability mass is split between home and away using the unchanged v1 decisive ranking blended with the v2 strength edge.

Serie A validation selected this candidate at Brier 0.5795, log loss 0.9735 and 53.64% accuracy, with 49 draw selections, 21.35% draw recall and 38.78% precision. Season-only was retained because recent form, venue form and H2H all worsened validation Brier despite sometimes increasing draw recall.

## Holdout conclusion

Bundesliga was first evaluated only after the candidate was frozen. The holdout rejected v2 as a general replacement: Brier worsened from 0.6185 to 0.6276, log loss from 1.0286 to 1.0437, and accuracy from 49.43% to 47.89%. V2 selected 14 draws but recovered only 2 of 69 (2.90% recall, 14.29% precision). No parameters were changed after this result. Historical-v1 therefore remains the preferred benchmark; historical-v2 is a research model demonstrating that explicit draw selection is possible but not yet stable across leagues.

Goal expectations and goal-market probabilities are deliberately unchanged from v1. The available bounded research did not validate a safe general improvement, so Over 2.5 and BTTS remain known weaknesses rather than receiving an unvalidated cosmetic change.
