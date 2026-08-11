import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { AI_CONFIDENCE_SHORT_DISCLAIMER, DEFAULT_PUBLISHING_CONTROLS, SELECTIVE_PUBLISHING_V1, applyAdminPublicationCommand, evaluateSelectivePublishing, publicPublicationResults, publicTopPicks, toPublicSelectivePublishingResult } = await import("../modules/football-intelligence/selective-publishing/index.ts");

const input = (index, overrides = {}) => ({ fixtureId: `fixture-${String(index).padStart(2, "0")}`, competitionId: "competition", season: "2024", kickoffAt: "2024-08-10T15:00:00Z", methodology: "historical-v1", selectedOutcome: "home", probabilities: { homeWin: .55, draw: .25, awayWin: .2 }, confidenceScore: Math.max(0, .9 - index / 100), evidence: { homeHistory: 12, awayHistory: 11, latestEvidenceAt: "2024-08-09T15:00:00Z" }, ...overrides });
const evaluate = (count, controls) => evaluateSelectivePublishing(Array.from({ length: count }, (_, index) => input(index + 1)), "2024-08-10", controls);
const tierMap = (results) => Object.fromEntries(results.map((result) => [result.fixtureId, { tier: result.publishingTier, rank: result.rankingMetadata.rank, label: result.confidenceLabel }]));

test("frozen policy awards Top Picks conservatively at 4, 5, 10 and 20 fixtures", () => {
  assert.deepEqual([4, 5, 10, 20].map((count) => publicTopPicks(evaluate(count)).length), [0, 1, 2, 4]);
  assert.deepEqual([4, 5, 10, 20].map((count) => evaluate(count)[0].rankingMetadata.topPickCutoff), [0, 1, 2, 4]);
  assert.equal(SELECTIVE_PUBLISHING_V1.topPickCoverage, .2);
  assert.equal(SELECTIVE_PUBLISHING_V1.minimumEligiblePopulationForTopPicks, 5);
});

test("invalid probabilities, insufficient history and missing confidence become limited evidence", () => {
  const results = evaluateSelectivePublishing([input(1, { probabilities: { homeWin: NaN, draw: .25, awayWin: .2 } }), input(2, { evidence: { homeHistory: 2, awayHistory: 12, latestEvidenceAt: "2024-08-09T15:00:00Z" } }), input(3, { confidenceScore: null })], "window");
  assert.ok(results.every((result) => result.publishingTier === "LIMITED_EVIDENCE"));
  assert.ok(results[0].reasonCodes.includes("NON_FINITE_PROBABILITIES"));
  assert.ok(results[1].reasonCodes.includes("INSUFFICIENT_HOME_HISTORY"));
  assert.ok(results[2].reasonCodes.includes("MISSING_CONFIDENCE_SCORE"));
});

test("unsupported historical-v2 and v3 methodologies are rejected", () => {
  const results = evaluateSelectivePublishing([input(1, { methodology: "historical-v2" }), input(2, { methodology: "historical-v3" })], "window");
  assert.ok(results.every((result) => result.publishingTier === "LIMITED_EVIDENCE" && result.reasonCodes.includes("UNSUPPORTED_METHODOLOGY")));
});

test("ranking and tie handling are deterministic under repetition and input reordering", () => {
  const tied = Array.from({ length: 10 }, (_, index) => input(index + 1, { confidenceScore: .7, probabilities: { homeWin: .5, draw: .3, awayWin: .2 }, evidence: { homeHistory: 10, awayHistory: 10, latestEvidenceAt: "2024-08-09T15:00:00Z" } })), first = evaluateSelectivePublishing(tied, "window"), second = evaluateSelectivePublishing([...tied].reverse(), "window"), third = evaluateSelectivePublishing(tied, "window");
  assert.deepEqual(tierMap(first), tierMap(second));
  assert.deepEqual(first, third);
  assert.deepEqual(publicTopPicks(first).map((result) => result.fixtureId).sort(), ["fixture-01", "fixture-02"]);
  assert.ok(first.every((result) => result.rankingMetadata.rank >= 1 && result.rankingMetadata.percentile >= 0 && result.rankingMetadata.percentile <= 1));
});

test("confidence labels allocate deterministic low, moderate and strong ranks independently of tiers", () => {
  const results = evaluate(6), byRank = [...results].sort((a, b) => a.rankingMetadata.rank - b.rankingMetadata.rank);
  assert.deepEqual(byRank.map((result) => result.confidenceLabel), ["STRONG", "STRONG", "MODERATE", "MODERATE", "LOW", "LOW"]);
  assert.equal(byRank[1].publishingTier, "STANDARD_ANALYSIS");
});

test("suppression removes a Top Pick publicly without promoting the next rank", () => {
  const base = evaluate(10), top = publicTopPicks(base)[0].fixtureId, controls = applyAdminPublicationCommand(DEFAULT_PUBLISHING_CONTROLS, { type: "SUPPRESS", fixtureId: top }), suppressed = evaluate(10, controls);
  assert.equal(suppressed.find((result) => result.fixtureId === top).publishingTier, "TOP_PICK");
  assert.equal(suppressed.find((result) => result.fixtureId === top).publicationState.publishable, false);
  assert.equal(publicTopPicks(suppressed).length, 1);
  assert.equal(suppressed.filter((result) => result.publishingTier === "TOP_PICK").length, 2);
});

test("global pause, publishing disable and Top-Pick disable preserve underlying analysis", () => {
  const paused = evaluate(10, { ...DEFAULT_PUBLISHING_CONTROLS, globalPause: true }), disabled = evaluate(10, { ...DEFAULT_PUBLISHING_CONTROLS, publishingEnabled: false }), noTop = evaluate(10, { ...DEFAULT_PUBLISHING_CONTROLS, topPicksEnabled: false });
  assert.equal(publicPublicationResults(paused).length, 0); assert.equal(publicPublicationResults(disabled).length, 0); assert.equal(publicTopPicks(noTop).length, 0);
  assert.equal(paused.filter((result) => result.publishingTier === "TOP_PICK").length, 2);
  assert.equal(noTop.filter((result) => result.publishingTier === "TOP_PICK").length, 2);
  assert.ok(noTop.filter((result) => result.publishingTier === "TOP_PICK").every((result) => result.publicationState.publiclyPresentedTier === "STANDARD_ANALYSIS"));
});

test("admin commands can suppress, unsuppress and pause but cannot manufacture predictions", () => {
  const original = input(1), suppressed = applyAdminPublicationCommand(DEFAULT_PUBLISHING_CONTROLS, { type: "SUPPRESS", fixtureId: original.fixtureId }), restored = applyAdminPublicationCommand(suppressed, { type: "UNSUPPRESS", fixtureId: original.fixtureId }), paused = applyAdminPublicationCommand(restored, { type: "PAUSE_PUBLICATION", paused: true });
  assert.equal(suppressed.suppressedFixtureIds.has(original.fixtureId), true); assert.equal(restored.suppressedFixtureIds.has(original.fixtureId), false); assert.equal(paused.globalPause, true);
  assert.deepEqual(input(1), original);
  assert.deepEqual(evaluateSelectivePublishing([original], "window", /** @type {any} */ ({ ...DEFAULT_PUBLISHING_CONTROLS, forceTopPick: true, confidenceScore: 1 }))[0].probabilities, original.probabilities);
});

test("actual outcomes and unrelated future fields cannot affect publishing classification", () => {
  const base = Array.from({ length: 10 }, (_, index) => input(index + 1)), altered = base.map((item, index) => ({ ...item, actualOutcome: index % 2 ? "home" : "away", finalScore: "9-9", futureLeaguePosition: 1, laterResult: "changed" }));
  assert.deepEqual(tierMap(evaluateSelectivePublishing(base, "window")), tierMap(evaluateSelectivePublishing(altered, "window")));
});

test("public output hides the raw reliability score and internal ranking components", () => {
  const result = evaluate(5)[0], publicResult = toPublicSelectivePublishingResult(result), serialized = JSON.stringify(publicResult);
  assert.doesNotMatch(serialized, /confidenceScore|rank|percentile|entropy|weight|component/i);
  assert.equal(publicResult.confidence.explanation, AI_CONFIDENCE_SHORT_DISCLAIMER);
});

test("production selective-publishing code has no research-model dependency", async () => {
  const fs = await import("node:fs/promises"), files = ["domain.ts", "policy.ts", "labels.ts", "engine.ts", "public.ts", "index.ts"], source = (await Promise.all(files.map((file) => fs.readFile(new URL(`../modules/football-intelligence/selective-publishing/${file}`, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(source, /historical-v2|historical-v3|historical-draw-research|calibration\.ts|actualOutcome|homeScore|awayScore/i);
});
