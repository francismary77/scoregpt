# Selective publishing architecture

## Purpose and scientific position

Selective publishing is an outcome-independent production policy around frozen historical-v1. It does not alter predictions. It classifies valid analysis into elevated presentation, ordinary analysis or limited-evidence presentation using the frozen Batch 4H.9 relative reliability score.

Historical-v1 remains the production methodology. Historical-v2, v2.1 calibration, historical-v3 and structural draw research remain research-only and are prohibited dependencies of this module. Historical-v1's structural weakness around draws remains documented; no draw heuristic, correction, quota or override affects publishing.

AI Confidence is a relative reliability indicator derived from historical evidence and probability structure. It is not a guaranteed or independently calibrated probability of success.

## Versioned methodologies

- Prediction: `historical-v1`
- Confidence: `historical-v1-confidence-v1`, backed by the unchanged Batch 4H.9 `compact-composite` scorer
- Publishing: `selective-publishing-v1`
- Ranking population: `DAILY_GLOBAL`

## Three publishing tiers

| Tier | Public label | Meaning |
|---|---|---|
| `TOP_PICK` | Top AI Pick | Eligible prediction ranked within the frozen top-20% daily policy. |
| `STANDARD_ANALYSIS` | Match Analysis | Valid analysis outside the elevated subset. |
| `LIMITED_EVIDENCE` | Limited Data | Integrity, evidence or methodology requirements were not met. |

Analysis is never removed merely because it is not a Top Pick. Probabilities, selected outcome and calculated tier remain intact when operational controls suppress public visibility.

## Confidence labels

Confidence labels are distinct from tiers. Eligible predictions are ranked by the frozen reliability score. Percentile `> 2/3` is `STRONG`, `> 1/3` is `MODERATE`, and the remainder is `LOW`. Public labels are Strong Confidence, Moderate Confidence and Low Confidence. A strong label can remain standard analysis because Top Pick coverage is narrower.

Confidence is not exposed publicly as a success probability. Public mapping omits raw score, rank, percentile, entropy, components, weights and research diagnostics.

## Frozen Top-Pick policy

`topPickCount = floor(eligibleCount * .20)` only when at least five eligible predictions exist. Thus 4/5/9/10/14/20 eligible fixtures produce 0/1/1/2/2/4 Top Picks. The coverage, minimum population and ranking population are immutable code policy, not environment or admin settings.

Ranking tie-breaks, in order:

1. Higher frozen reliability score.
2. Higher maximum historical-v1 1X2 probability.
3. Larger top-two probability margin.
4. Greater minimum team-history count.
5. Provider fixture ID ascending.

Ranks are 1-based and percentile is `(population - rank + 1) / population`. Input ordering and repeated runs cannot affect results.

## Eligibility and reason codes

Eligibility requires finite, bounded, normalized probabilities; argmax-consistent selected outcome; at least five prior matches for each team; valid fixture, competition and season identity; latest evidence strictly before kickoff; available bounded reliability score; and methodology `historical-v1`.

Machine-readable reasons distinguish insufficient home/away/both history, invalid/non-finite/unnormalized probabilities, invalid outcome or identity, missing confidence, leakage guard failure and unsupported methodology. `INSUFFICIENT_RANKING_POPULATION` prevents elevation but leaves valid analysis as standard.

## Admin and operational controls

Operational controls support `publishingEnabled`, `topPicksEnabled`, `globalPause` and fixture suppression. Admin commands are limited to `SUPPRESS`, `UNSUPPRESS` and `PAUSE_PUBLICATION`.

Admins cannot promote a prediction, set confidence, change probability, force an outcome, alter methodology or change rank. Suppressing a Top Pick does not promote the next candidate. A later explicit evaluation run is required to recalculate tiers.

Global pause and publishing disable make results non-publishable without deleting analysis or rewriting calculated tiers. Disabling Top Picks presents calculated Top Picks publicly as ordinary Match Analysis while preserving their internal calculated tier and confidence.

## API and public-output policy

No public API route is added in this batch because no live publication workflow exists. Pure helpers support future all-analysis and Top-Pick endpoints and a safe public DTO containing only fixture ID, prediction methodology/outcome/probabilities, confidence label/explanation and effective publication tier.

Public copy is centralized. It contains no guaranteed, banker, sure-win, safe-bet, profit or retrospective-accuracy claim.

Short disclaimer: “AI Confidence is a relative reliability indicator based on available historical evidence. It is not a guarantee of the match outcome.”

Long explanation: “Prediction Confidence ranks how strongly the available historical evidence supports a model prediction. It should not be interpreted as a guaranteed success rate or as independently calibrated betting odds.”

## Persistence and schema safeguards

The existing `intelligence_reports` schema can store legacy confidence but does not yet provide all versioned publishing metadata. A migration is unnecessary for this pure architecture batch and is intentionally deferred until shadow-mode persistence requirements are defined. No schema file was created or applied, no record was written and no historical prediction was backfilled or published.

Future nullable fields may record prediction methodology, confidence methodology, publishing policy, score, label, tier, reasons and evaluation time without destructive changes.

## Anti-leakage and research isolation

Selective input contains no actual result, score, future fixture, final table or post-match field. Classification depends only on prediction probabilities, selected outcome, already-calculated reliability score, pre-kickoff evidence counts/timestamp and stable identities. Tests prove extra actual/future fields cannot alter tiers.

A dependency test rejects imports of historical-v2, historical-v3, calibration or structural-draw research. The calculation is pure and has no repository/provider/persistence dependency.

## Retrospective architecture sanity check

The frozen policy was run descriptively on 1,449 already-inspected predictions across 170 fixture dates. It produced 215 Top Picks, 1,234 Standard Analyses and zero Limited-Evidence records; 92 dates had fewer than five eligible matches and therefore awarded no Top Pick. Historical Top-Pick accuracy was 68.84%, Brier .470469 and log loss .823418; Standard Analysis was 47.24%, .628718 and 1.044703.

These are retrospective architecture diagnostics only. They did not tune coverage, thresholds, coefficients, labels or policy, and they must not become public performance claims or expected live accuracy.

## Known limitations

- Historical-v1 remains structurally weak around draws.
- Reliability is relative ranking, not calibrated success probability.
- Percentile behavior can vary across competitions and time.
- Small daily populations produce no Top Picks.
- Rich event, lineup, injury and xG inputs are not incorporated.
- Long live forward performance has not been established.
- No football result, betting outcome or profit is guaranteed.

## Recommended next batch

Batch 4H.15 should be **Live Prediction Pipeline Integration — Dry Run / Shadow Mode**: generate historical-v1 analysis for upcoming fixtures, compute the frozen reliability score, classify tiers and optionally persist internally with publication disabled. It should pre-register forward monitoring before outcome collection and must not publish publicly yet.
