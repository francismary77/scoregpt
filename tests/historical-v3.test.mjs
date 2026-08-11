import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { buildMatchAnalysisInput } = await import("../modules/football-data/historical.ts");
const { runHistoricalBacktest } = await import("../modules/football-backtesting/engine.ts");
const { createHistoricalV3MatchIntelligence, createPoissonScoreMatrix, HISTORICAL_V3_MODEL_VERSION } = await import("../modules/football-intelligence/historical-v3/index.ts");

const competition = { id: "v3", providerId: "v3", name: "V3 Test", country: "Test", season: "2024" };
const teams = ["a", "b", "c", "d"].map((id, i) => ({ id, providerId: String(i), name: id }));
const fixture = (id, homeTeamId, awayTeamId, homeScore, awayScore, day, hour = 12) => ({ id, providerFixtureId: id, homeTeamId, awayTeamId, homeScore, awayScore, kickoffAt: `2024-01-${String(day).padStart(2, "0")}T${hour}:00:00Z`, status: "finished", round: "Regular" });
const fixtures = [fixture("1", "a", "c", 2, 0, 1), fixture("2", "b", "d", 1, 1, 1), fixture("3", "c", "a", 1, 2, 2), fixture("4", "d", "b", 0, 1, 2), fixture("5", "a", "d", 3, 1, 3), fixture("6", "b", "c", 2, 0, 3), fixture("7", "c", "b", 1, 1, 4), fixture("8", "d", "a", 0, 2, 4), fixture("9", "a", "b", 2, 1, 5), fixture("10", "b", "a", 1, 1, 6), fixture("target", "a", "b", 1, 0, 10), fixture("same", "c", "d", 9, 9, 10), fixture("future", "b", "c", 8, 0, 11)];
const dataset = { competition, teams, fixtures };

test("Poisson score matrix is normalized with a bounded negligible tail", () => {
  const matrix = createPoissonScoreMatrix(2.4, 1.3);
  assert.ok(matrix.maximumGoals >= 8);
  assert.ok(matrix.residualTail < 1e-7);
  assert.ok(Math.abs(matrix.scorelines.reduce((sum, score) => sum + score.probability, 0) - 1) < 1e-12);
});

test("historical-v3 derives coherent finite 1X2 and paired goal markets", () => {
  const result = createHistoricalV3MatchIntelligence(buildMatchAnalysisInput(dataset, "a", "b", { analysisDate: fixtures[10].kickoffAt }));
  assert.equal(result.modelVersion, HISTORICAL_V3_MODEL_VERSION);
  assert.ok(Math.abs(Object.values(result.probabilities).reduce((sum, value) => sum + value, 0) - 1) < 1e-6);
  assert.ok(Math.abs(result.goalMarkets.bttsYes + result.goalMarkets.bttsNo - 1) < 1e-6);
  assert.ok([...Object.values(result.probabilities), ...Object.values(result.goalMarkets)].every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
});

test("league baselines, team strengths, target and future scores are strictly point-in-time", () => {
  const target = fixtures[10], base = runHistoricalBacktest(dataset, { minimumPriorMatches: 1 }, createHistoricalV3MatchIntelligence).predictions.find((p) => p.fixture.id === "target");
  const changed = { ...dataset, fixtures: dataset.fixtures.map((item) => item.id === "target" ? { ...item, homeScore: 9, awayScore: 9 } : item.id === "same" || item.id === "future" ? { ...item, homeScore: 20, awayScore: 0 } : item) };
  const altered = runHistoricalBacktest(changed, { minimumPriorMatches: 1 }, createHistoricalV3MatchIntelligence).predictions.find((p) => p.fixture.id === "target");
  assert.deepEqual(base.probabilities, altered.probabilities);
  assert.deepEqual(base.goalMarkets, altered.goalMarkets);
  const input = buildMatchAnalysisInput(dataset, "a", "b", { analysisDate: target.kickoffAt });
  assert.equal(input.leagueScoring.matches, 10);
});

test("v3 repeated walk-forward evaluation is deterministic", () => {
  const first = runHistoricalBacktest(dataset, { minimumPriorMatches: 1 }, createHistoricalV3MatchIntelligence), second = runHistoricalBacktest(dataset, { minimumPriorMatches: 1 }, createHistoricalV3MatchIntelligence);
  assert.deepEqual(first, second);
});
