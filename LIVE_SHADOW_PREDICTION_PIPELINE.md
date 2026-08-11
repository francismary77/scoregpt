# Batch 4H.15 — Live Shadow Prediction Pipeline

## Status and objective

Implemented as **forward shadow evaluation infrastructure**. It joins persisted upcoming fixtures, unchanged historical-v1, the frozen `compact-composite-4h9` scorer, and the unchanged `selective-publishing-4h14` policy. It does not create a public prediction product.

## Architecture

The server-side flow is: supported persisted fixture → strict pre-kickoff historical evidence → historical-v1 → frozen confidence → complete UTC daily population → selective-publishing classification → optional private shadow persistence. Settlement is a separate operation and cannot mutate the frozen prediction fields.

Files are isolated under `modules/football-intelligence/shadow-pipeline`. No public route, frontend query, scheduler, cron, email, Telegram, webhook, or OpenAI integration was added.

## Controls and API behavior

`SHADOW_PREDICTION_PIPELINE_ENABLED`, `SHADOW_PROVIDER_CALLS_ENABLED`, and `PUBLIC_PREDICTION_PUBLISHING_ENABLED` default to `false`. The default horizon is 72 hours, provider ceiling is one request per run, and fixture refresh age is 180 minutes. This implementation processes local persisted input only; provider refresh is deliberately left behind the disabled boundary. Supported competitions come from the existing central allowlist. Unknown provider IDs are never guessed.

Manual invocation calls `runShadowPredictionPipeline()` with explicit sources, repositories, controls and `{ now, dryRun, persist, providerRefresh, horizonHours }`. `dryRun` or `persist=false` reports intended records without writes. A future scheduler may invoke it every 1–3 hours, but no scheduler is activated.

## Database schema and safeguards

The additive migration creates private `football_shadow_predictions` and `football_shadow_runs` tables. It does not alter historical source tables. Shadow mode and `SHADOW_ONLY` are database defaults, only shadow operational states are accepted, anon/authenticated access is revoked, RLS is enabled, and there is no publication trigger.

The prediction uniqueness key is fixture + methodology version + publishing-policy version + shadow mode. Application repositories also use find-or-insert/upsert-like behavior for rerun and concurrency safety.

## Freeze, cutoff and versioning

One frozen prediction is created per fixture/version identity. Its probabilities, selection, confidence, calculated tier, versions, creation timestamp and evidence cutoff are immutable through settlement. Evidence is filtered with strict timestamps before prediction creation; fixtures at the same kickoff cannot learn from one another.

Stable versions are:

- Methodology: `historical-v1-frozen-4h`
- Confidence: `compact-composite-4h9`
- Publishing policy: `selective-publishing-4h14`

UTC is used for timestamps and ranking dates. Ranking is assembled by complete UTC fixture day before Top Picks are assigned. The frozen 20% floor rule, five-prediction minimum, tie-break order, three tiers and three confidence labels are unchanged.

## Eligibility and skip reasons

Fixtures require supported competition/season identity, resolved distinct teams, valid future kickoff within the horizon, an allowed upcoming status, sufficient unchanged-v1 history, normalized probabilities, and evidence strictly earlier than creation. Typed skips cover disabled pipeline, unsupported competition, invalid/started/cancelled fixture, missing kickoff/team, insufficient history, invalid probabilities, future evidence and disabled refresh.

Malformed fixtures are isolated; they do not crash other fixture processing.

## Settlement and forward metrics

Settlement accepts completed persisted fixture results and derives HOME/DRAW/AWAY plus correctness. Pending fixtures cannot settle. Cancelled and abandoned fixtures are excluded; postponed fixtures remain unsettled. Settlement never changes prediction values or reranks old predictions.

Observational diagnostics calculate predictions, settled count, correctness, accuracy, multiclass Brier score and log loss overall and by tier, confidence label, selection, competition and UTC prediction date. Top-Pick metrics include coverage and Wilson intervals only once sample size is sufficient. These metrics never update model parameters.

## Public and admin safety

Shadow records have no public grant or public API. Public publishing remains hard-disabled. Operational suppression can be represented separately, while no admin operation can edit probabilities, confidence, tier, versions or timestamps, backdate a record, promote a prediction, or fabricate settlement through this service.

Confidence continues to mean relative model evidence—not a guaranteed success probability. Football outcomes remain uncertain; predictions are informational and responsible betting guidance remains required for any future UI.

## Research isolation and limitations

Historical-v2, v2.1, v3, draw calibration and structural draw research remain isolated. There is no league-specific tuning, forced draw behavior, self-learning or outcome-driven parameter adjustment.

The additive migration was applied to the verified ScoreGPT Development Supabase project during Batch 4H.16. RLS is enabled, no anon/authenticated grants or policies exist, and both shadow tables began with zero rows. Database-only checks found no upcoming Scottish Premiership 2024 fixtures in either the 72-hour default or 168-hour defensive window. The correct activation status remains: **NO ELIGIBLE LIVE FIXTURES AVAILABLE FOR SHADOW SMOKE TEST**.

Recommended next step: obtain approved current-season access and explicitly update a verified competition/season mapping, then perform a new database-only dry run before authorizing any provider refresh or shadow persistence. Public publishing must remain disabled.

Batch 4H.17A subsequently verified provider league 179 season 2026 as current (31 July 2026–10 April 2027). A bounded provider acquisition returned no fixtures within 168 hours, so fixture writes, prediction proposals, shadow rows and publications remained zero. The historical 2024 mapping and dataset remain preserved.
