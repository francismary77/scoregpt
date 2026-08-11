# Historical-v2 draw calibration research

## 1. Objective and scientific classification

Batch 4H.12 tested whether the Batch 4H.11 draw signal could be integrated without degrading proper probabilistic scoring. The result is **FAILED CALIBRATION CANDIDATE**. No candidate was frozen or promoted. Historical-v1 remains the operational benchmark and the exact Batch 4H.11 `historical-v2` remains the draw-research reference.

## 2. Dataset protocol and boundaries

Only persisted 2024 development data from Scotland (179), Premier League (39), La Liga (140), Serie A (135) and Bundesliga (78) was read. Eligible walk-forward predictions were sorted by kickoff and provider fixture ID independently per league. Every model input used fixtures strictly before target kickoff.

| League | Earliest 55% development | Next 15% calibration | Locked, inspected 30% |
|---|---:|---:|---:|
| Scottish Premiership | 108 | 30 | 60 |
| Premier League | 181 | 49 | 100 |
| La Liga | 181 | 49 | 100 |
| Serie A | 181 | 49 | 100 |
| Bundesliga | 143 | 39 | 79 |
| **Total** | **794** | **216** | **439** |

The locked 439 outcomes were structurally unavailable to the candidate-search function. They did not influence features, coefficients, temperatures, damping, candidate ranking or acceptance. Ligue 1 was not loaded, scored or inspected. No dataset was written.

## 3. Preserved baselines

- Historical-v1 behavior, parameters, selections and confidence are unchanged.
- Historical-v2 remains version `historical-v2` with frozen `conservative-2.5` Batch 4H.11 parameters.
- Historical-v3 is unchanged.
- The Batch 4H.9 `compact-composite` confidence selector and formula are unchanged.
- Experimental integration code uses a separate `historical-v2.1-research` identifier and has no installed default because no candidate passed.

On the 216-fixture calibration slice, v1 achieved 53.24% accuracy, 0.608880 Brier and 1.022239 log loss. Baseline v2 achieved 50.93%, 0.609846 and 1.020533 respectively, selecting 18 draws with 22.22% precision against 23.61% draw prevalence.

## 4. Draw-signal and true/false diagnostics

Diagnostics below use the 794 development plus 216 calibration observations only. Values are group means.

| Group | N | Draw p | H/A gap | Entropy | xG gap | Expected total | Strength similarity | Draw-rate evidence | Min history | Min venue | Max p |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Correct v2 draws | 33 | .3694 | .0325 | .9952 | .2781 | 2.3701 | .9484 | .2955 | 14.00 | 6.45 | .3694 |
| False v2 draws | 76 | .3722 | .0336 | .9950 | .2686 | 2.4280 | .9471 | .3276 | 16.01 | 7.49 | .3722 |
| Actual draws missed | 218 | .2636 | .2597 | .9251 | .5504 | 2.9040 | .6291 | .2589 | 15.88 | 7.57 | .4981 |
| Correct decisive picks | 463 | .2387 | .3338 | .8758 | .7012 | 2.9494 | .5280 | .2530 | 15.75 | 7.44 | .5476 |

The current features separate draw-like from decisive fixtures, but they do not separate true draw selections from false ones. Correct and false draw selections have nearly identical draw probability, home/away gap, entropy, expected-goal gap and strength similarity. Worse, false draws show higher historical draw-rate evidence. This explains why increasing draw mass improves recall but not proper scoring.

## 5. Candidate families and bounded search

Twenty-two candidates were declared before calibration ranking: exact baseline v2; temperatures .85/.90/.95/1.05/1.10/1.15; draw-adjustment multipliers .60/.75/.90/1.10; strength, expected-goal, evidence and combined continuous damping; weaker/stronger low-goal, score-closeness and strength-similarity coefficients; and point-in-time draw-rate shrinkage toward a fixed 25% development prior with strength 10. All preserve normalized multiclass probabilities and argmax selection. No class override or quota exists.

| Candidate | Acc % | Brier | Log loss | Picks/correct | Precision % | Recall % | Draw Brier | Draw p: D/ND |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline-v2 | 50.93 | .609841 | 1.020525 | 18/4 | 22.22 | 7.84 | .180854 | .2814/.2663 |
| temperature-.85 | 50.93 | .612054 | 1.024893 | 18/4 | 22.22 | 7.84 | .181161 | .2717/.2548 |
| temperature-.90 | 50.93 | .610914 | 1.022714 | 18/4 | 22.22 | 7.84 | .180989 | .2753/.2589 |
| temperature-.95 | 50.93 | .610205 | 1.021319 | 18/4 | 22.22 | 7.84 | .180892 | .2785/.2628 |
| temperature-1.05 | 50.93 | .609751 | 1.020193 | 18/4 | 22.22 | 7.84 | .180862 | .2841/.2695 |
| temperature-1.10 | 50.93 | .609879 | 1.020217 | 18/4 | 22.22 | 7.84 | .180906 | .2865/.2724 |
| temperature-1.15 | 50.93 | .610179 | 1.020514 | 18/4 | 22.22 | 7.84 | .180978 | .2887/.2752 |
| draw-shrink-.60 | 52.78 | .608636 | 1.020155 | 6/2 | 33.33 | 3.92 | .180259 | .2816/.2702 |
| draw-shrink-.75 | 52.78 | .608960 | 1.020118 | 10/3 | 30.00 | 5.88 | .180404 | .2815/.2687 |
| draw-shrink-.90 | 50.93 | .609437 | 1.020290 | 17/4 | 23.53 | 7.84 | .180643 | .2815/.2673 |
| draw-shrink-1.10 | 49.54 | .610313 | 1.020861 | 26/5 | 19.23 | 9.80 | .181106 | .2814/.2653 |
| strength gate | 50.93 | .610151 | 1.022520 | 18/4 | 22.22 | 7.84 | .181263 | .2853/.2740 |
| expected-goal gate | 50.93 | .609976 | 1.022006 | 17/4 | 23.53 | 7.84 | .181102 | .2836/.2714 |
| evidence gate | 50.93 | .609838 | 1.020521 | 18/4 | 22.22 | 7.84 | .180852 | .2814/.2663 |
| combined gate | 50.93 | .610117 | 1.022592 | 17/4 | 23.53 | 7.84 | .181245 | .2853/.2742 |
| low-goal weaker | 52.78 | .608602 | 1.018634 | 11/3 | 27.27 | 5.88 | .180059 | .2731/.2580 |
| low-goal stronger | 48.61 | .611380 | 1.022841 | 31/6 | 19.35 | 11.76 | .181840 | .2898/.2747 |
| score-closeness weaker | 53.70 | .607826 | 1.017603 | 1/1 | 100.00* | 1.96 | .179433 | .2504/.2378 |
| score-closeness stronger | 46.30 | .615192 | 1.028424 | 55/13 | 23.64 | 25.49 | .184454 | .3145/.2967 |
| strength-similarity weaker | 53.70 | .607189 | 1.016876 | 1/1 | 100.00* | 1.96 | .179161 | .2540/.2415 |
| strength-similarity stronger | 45.37 | .615335 | 1.028204 | 53/12 | 22.64 | 23.53 | .184407 | .3104/.2925 |
| draw-rate shrunk | 50.46 | .609954 | 1.020805 | 19/4 | 21.05 | 7.84 | .180886 | .2806/.2659 |

`*` One prediction is not a stable precision estimate.

## 6. Candidate decision and league robustness

The proper-score leader, `strength-similarity-weaker`, technically clears aggregate score tolerances but predicts only one draw, solely in Serie A. Scotland, England, Spain and Germany collapse to zero draw selections. It therefore fails non-collapse and credible-discrimination requirements. Draw-shrink .60 and .75 retain slightly more draws, but samples remain too small and league behavior remains unstable. Candidates with meaningful recall have precision at or below prevalence and worse probability scores.

| Calibration league | V1 acc/Brier/LL | Baseline v2 acc/Brier/LL | Baseline draw picks/correct | Screening-best draw picks |
|---|---|---|---:|---:|
| Scotland | 63.33%/.5774/.9875 | 63.33%/.5742/.9720 | 0/0 | 0 |
| Premier League | 48.98%/.6185/1.0350 | 44.90%/.6198/1.0341 | 5/0 | 0 |
| La Liga | 53.06%/.5976/1.0023 | 46.94%/.5954/.9993 | 7/1 | 0 |
| Serie A | 55.10%/.5863/.9834 | 55.10%/.5831/.9802 | 4/2 | 1 |
| Bundesliga | 48.72%/.6635/1.1068 | 48.72%/.6765/1.1182 | 2/1 | 0 |

Baseline v2 draw precision is below league prevalence in England and Spain, selects no draws in Scotland, and materially worsens Bundesliga probability quality. The screening leader eliminates draw behavior in four leagues. No candidate is accepted.

## 7. Draw and multiclass calibration

Baseline calibration draw buckets `(count, mean p, observed)` were: 0–9% `(1,.099,0%)`; 10–14% `(12,.128,8.3%)`; 15–19% `(28,.176,14.3%)`; 20–24% `(34,.224,26.5%)`; 25–29% `(48,.273,29.2%)`; 30–34% `(68,.322,26.5%)`; 35–39% `(24,.362,16.7%)`; 40%+ `(1,.406,100%)`. Buckets under 20 observations are sparse. The reversal above 30% is material evidence of unstable draw calibration.

Because no candidate was accepted, no selected-candidate multiclass calibration, ECE, chronological stability or frozen-confidence interaction was performed. Running those analyses on a rejected candidate would create misleading model-selection theatre. The unchanged Batch 4H.11 reference already records the confidence interaction for baseline v2.

## 8. Previously inspected reference evaluation

No 4H.12 candidate was frozen, so the locked late 30% was not re-opened or scored by v2.1. Its already-known Batch 4H.11 reference remains: 439 fixtures; v1 51.25% accuracy, .600357 Brier, 1.003064 log loss; baseline v2 51.25%, .600786, 1.005386, 51 draw selections, 33.33% precision, 15.74% recall and 21.38% F1. This is explicitly previously inspected, not holdout evidence.

## 9. Anti-leakage, limitations and recommendation

Target, same-kickoff and future fixtures remain excluded. League and season datasets are supplied independently, and candidate search receives only calibration arrays—not locked-reference outcomes. No final table, final-season prior, odds, injuries, lineups, post-match statistics or target result is used.

The principal limitation is not lack of aggregate draw-like discrimination; it is the inability of current pre-kickoff features to distinguish correct draw selections from false draw selections. Calibration has only 216 fixtures and some leagues have few draws. More coefficient tuning on these same outcomes would overfit.

Recommendation: retain historical-v1 operationally and retain Batch 4H.11 historical-v2 as research-only. Do not acquire or evaluate a fresh Batch 4H.13 holdout for this failed candidate. Future draw work should begin with genuinely new, independently motivated point-in-time features and a new pre-registered protocol, not further tuning of this grid.
