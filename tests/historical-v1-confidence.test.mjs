import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { runHistoricalBacktest } = await import("../modules/football-backtesting/engine.ts");
const { createHistoricalMatchIntelligence } = await import("../modules/football-intelligence/engine.ts");
const { extractConfidenceFeatures, selectedConfidenceCandidate, selectCoverage, makeObservations, wilsonInterval } = await import("../modules/football-confidence/index.ts");

const competition = { id: "confidence", providerId: "1", name: "Confidence", country: "Test", season: "2024" }, teams = ["a", "b", "c", "d"].map((id) => ({ id, providerId: id, name: id }));
const fixture = (id, h, a, hs, as, day, hour = 12) => ({ id, providerFixtureId: id, homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as, kickoffAt: `2024-01-${String(day).padStart(2, "0")}T${hour}:00:00Z`, status: "finished", round: "Regular" });
const fixtures = [fixture("1", "a", "c", 2, 0, 1), fixture("2", "b", "d", 0, 1, 1), fixture("3", "c", "a", 1, 1, 2), fixture("4", "d", "b", 0, 2, 2), fixture("5", "a", "d", 3, 1, 3), fixture("6", "b", "c", 2, 0, 3), fixture("7", "c", "b", 0, 1, 4), fixture("8", "d", "a", 1, 2, 4), fixture("9", "a", "b", 2, 0, 5), fixture("10", "b", "a", 1, 1, 6), fixture("target", "a", "b", 1, 0, 10), fixture("same", "c", "d", 9, 9, 10), fixture("future", "b", "c", 8, 0, 11)], dataset = { competition, teams, fixtures };

test("confidence features are deterministic and distinct from v1 probabilities", () => {
  const report = runHistoricalBacktest(dataset, { minimumPriorMatches: 1 }, createHistoricalMatchIntelligence), item = report.predictions.find((p) => p.fixture.id === "target"), before = structuredClone(item.probabilities), first = extractConfidenceFeatures(item);
  assert.deepEqual(first, extractConfidenceFeatures(item));
  assert.equal(selectedConfidenceCandidate.score(first), selectedConfidenceCandidate.score(first));
  assert.deepEqual(item.probabilities, before);
});

test("target, simultaneous and future outcomes cannot alter confidence", () => {
  const get = (source) => { const item = runHistoricalBacktest(source, { minimumPriorMatches: 1 }, createHistoricalMatchIntelligence).predictions.find((p) => p.fixture.id === "target"); return { probabilities: item.probabilities, features: extractConfidenceFeatures(item), score: selectedConfidenceCandidate.score(extractConfidenceFeatures(item)) }; }, base = get(dataset), changed = get({ ...dataset, fixtures: fixtures.map((item) => item.id === "target" || item.id === "same" || item.id === "future" ? { ...item, homeScore: 20, awayScore: 19 } : item) }), removed = get({ ...dataset, fixtures: fixtures.filter((item) => item.id !== "future") });
  assert.deepEqual(changed, base);
  assert.deepEqual(removed, base);
});

test("coverage selection is deterministic and Wilson intervals remain bounded", () => {
  const observations = makeObservations("test", runHistoricalBacktest(dataset, { minimumPriorMatches: 1 }, createHistoricalMatchIntelligence).predictions);
  assert.deepEqual(selectCoverage(observations, selectedConfidenceCandidate, .5), selectCoverage(observations, selectedConfidenceCandidate, .5));
  const interval = wilsonInterval(20, 30);
  assert.ok(interval.lower >= 0 && interval.upper <= 1 && interval.lower < interval.upper);
});
