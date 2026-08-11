import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { buildMatchAnalysisInput } = await import("../modules/football-data/historical.ts");
const { createHistoricalMatchIntelligence, HISTORICAL_MODEL_VERSION } = await import("../modules/football-intelligence/index.ts");
const { createHistoricalV2MatchIntelligence, createHistoricalV21MatchIntelligence, HISTORICAL_V2_MODEL_VERSION, HISTORICAL_V21_MODEL_VERSION, historicalV2Candidates, historicalV2Parameters, historicalV21Candidates, historicalV21Parameters, calibrationPartition, searchHistoricalV2Development, searchHistoricalV21Calibration } = await import("../modules/football-intelligence/historical-v2/index.ts");

const competition = { id: "league", providerId: "test", name: "Test League", country: "Test", season: "2024" };
const teams = ["home", "away", "third", "fourth"].map((id, index) => ({ id, providerId: String(index + 1), name: id }));
const fixture = (id, homeTeamId, awayTeamId, homeScore, awayScore, day, status = "finished") => ({ id, providerFixtureId: id, homeTeamId, awayTeamId, homeScore, awayScore, kickoffAt: `2024-01-${String(day).padStart(2, "0")}T12:00:00Z`, status, round: "Regular" });
const dataset = { competition, teams, fixtures: [
  fixture("1", "home", "third", 1, 1, 1), fixture("2", "away", "fourth", 0, 0, 2),
  fixture("3", "third", "away", 1, 1, 3), fixture("4", "fourth", "home", 0, 0, 4),
  fixture("5", "home", "away", 1, 1, 5), fixture("6", "away", "home", 0, 0, 6),
  fixture("7", "home", "third", 2, 1, 7), fixture("8", "away", "fourth", 1, 0, 8),
  fixture("9", "third", "home", 1, 1, 9), fixture("10", "fourth", "away", 0, 0, 10),
  fixture("11", "home", "away", 1, 1, 11), fixture("12", "away", "home", 1, 1, 12),
] };

test("historical-v1 and historical-v2 remain explicitly separate", () => {
  const input = buildMatchAnalysisInput(dataset, "home", "away");
  assert.equal(HISTORICAL_MODEL_VERSION, "historical-v1");
  assert.equal(HISTORICAL_V2_MODEL_VERSION, "historical-v2");
  assert.equal(createHistoricalMatchIntelligence(input).modelVersion, "historical-v1");
  assert.equal(createHistoricalV2MatchIntelligence(input).modelVersion, "historical-v2");
  const v1 = createHistoricalMatchIntelligence(input), v2 = createHistoricalV2MatchIntelligence(input);
  assert.deepEqual(v1.probabilities, { homeWin: 0.3439, draw: 0.34, awayWin: 0.3161 });
  assert.deepEqual(v1.goalMarkets, { over15: 0.6539, over25: 0.2402, over35: 0.0847, bttsYes: 0.5205, bttsNo: 0.4795 });
  assert.equal(v1.confidence, "moderate");
  assert.deepEqual(v2.probabilities, { homeWin: 0.2734, draw: 0.4752, awayWin: 0.2514 });
  assert.equal(v2.confidence, "low");
});

test("historical-v2 is deterministic and all probability outputs are finite", () => {
  const input = buildMatchAnalysisInput(dataset, "home", "away"), first = createHistoricalV2MatchIntelligence(input), second = createHistoricalV2MatchIntelligence(input);
  assert.deepEqual(first, second);
  const oneXTwo = Object.values(first.probabilities), markets = Object.values(first.goalMarkets).filter((value) => value !== null);
  assert.ok(oneXTwo.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.ok(Math.abs(oneXTwo.reduce((sum, value) => sum + value, 0) - 1) < 1e-6);
  assert.ok(markets.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.ok(Math.abs(first.goalMarkets.bttsYes + first.goalMarkets.bttsNo - 1) < 1e-6);
});

test("explicit draw evidence can make a balanced fixture the top outcome", () => {
  const input = buildMatchAnalysisInput(dataset, "home", "away"), result = createHistoricalV2MatchIntelligence(input, {
    name: "test-draw", drawIntercept: -1, strengthProximityWeight: 1.4, expectedGoalClosenessWeight: .8,
    lowGoalsWeight: .4, drawPropensityWeight: 1.2, balanceWeight: .8, entropyWeight: .4, interactionWeight: .4,
  });
  assert.ok(result.probabilities.draw > result.probabilities.homeWin);
  assert.ok(result.probabilities.draw > result.probabilities.awayWin);
});

test("zero history and missing H2H remain neutral, finite and low-confidence", () => {
  const empty = { competition, teams: teams.slice(0, 2), fixtures: [fixture("future", "home", "away", null, null, 20, "scheduled")] };
  const result = createHistoricalV2MatchIntelligence(buildMatchAnalysisInput(empty, "home", "away"));
  assert.equal(result.confidence, "low");
  assert.ok(Math.abs(result.probabilities.homeWin - result.probabilities.awayWin) < 1e-6);
  assert.ok(Object.values(result.probabilities).every(Number.isFinite));
});

test("home/away swapping recomputes venue-aware inputs without mutation", () => {
  const originalInput = buildMatchAnalysisInput(dataset, "home", "away"), swappedInput = buildMatchAnalysisInput(dataset, "away", "home");
  const original = createHistoricalV2MatchIntelligence(originalInput), swapped = createHistoricalV2MatchIntelligence(swappedInput);
  assert.equal(original.homeTeam.id, swapped.awayTeam.id);
  assert.equal(original.awayTeam.id, swapped.homeTeam.id);
  assert.deepEqual(dataset.fixtures[0], fixture("1", "home", "third", 1, 1, 1));
});

test("candidate search is bounded, deterministic and accepts development datasets only", () => {
  assert.equal(historicalV2Candidates.length, 12);
  assert.equal(searchHistoricalV2Development.length, 1);
  const first = searchHistoricalV2Development([dataset]), second = searchHistoricalV2Development([dataset]);
  assert.equal(first.candidatesEvaluated, 12);
  assert.deepEqual(first.selected, second.selected);
});

test("frozen v2 parameters preserve v1 home-away ordering", () => {
  const input = buildMatchAnalysisInput(dataset, "home", "away"), v1 = createHistoricalMatchIntelligence(input), v2 = createHistoricalV2MatchIntelligence(input);
  assert.equal(historicalV2Parameters.name, "conservative-2.5");
  assert.equal(Math.sign(v1.probabilities.homeWin - v1.probabilities.awayWin), Math.sign(v2.probabilities.homeWin - v2.probabilities.awayWin));
});

test("future fixture outcomes cannot leak into point-in-time v2 predictions", () => {
  const cutoff = "2024-01-15T12:00:00Z", base = buildMatchAnalysisInput(dataset, "home", "away", { analysisDate: cutoff });
  const future = fixture("future-result", "home", "away", 9, 0, 20);
  const withFuture = buildMatchAnalysisInput({ ...dataset, fixtures: [...dataset.fixtures, future] }, "home", "away", { analysisDate: cutoff });
  assert.deepEqual(createHistoricalV2MatchIntelligence(base), createHistoricalV2MatchIntelligence(withFuture));
});

test("target and same-kickoff results cannot alter v2 probabilities or evidence", () => {
  const target = fixture("target", "home", "away", 1, 0, 20), simultaneous = { ...fixture("simultaneous", "third", "fourth", 2, 2, 20), kickoffAt: target.kickoffAt }, baseDataset = { ...dataset, fixtures: [...dataset.fixtures, target, simultaneous] };
  const changed = { ...baseDataset, fixtures: baseDataset.fixtures.map((item) => item.id === "target" || item.id === "simultaneous" ? { ...item, homeScore: 20, awayScore: 0 } : item) };
  const options = { analysisDate: target.kickoffAt }, before = createHistoricalV2MatchIntelligence(buildMatchAnalysisInput(baseDataset, "home", "away", options)), after = createHistoricalV2MatchIntelligence(buildMatchAnalysisInput(changed, "home", "away", options));
  assert.deepEqual(before, after);
});

test("v2 and v2.1 research engines do not mutate historical datasets", () => {
  const before = structuredClone(dataset), input = buildMatchAnalysisInput(dataset, "home", "away");
  createHistoricalV2MatchIntelligence(input);
  createHistoricalV21MatchIntelligence(input, historicalV21Candidates[0]);
  assert.deepEqual(dataset, before);
});

test("Batch 4H.12 split locks the final 30% away from candidate search", () => {
  const predictions = Array.from({ length: 20 }, (_, index) => ({ fixture: { kickoffAt: `2024-01-${String(index + 1).padStart(2, "0")}`, providerFixtureId: String(index + 1) } }));
  const partition = calibrationPartition(predictions);
  assert.deepEqual([partition.development.length, partition.calibration.length, partition.lockedReference.length], [11, 3, 6]);
  assert.equal(searchHistoricalV21Calibration.length, 1);
  assert.equal(historicalV21Candidates.length, 22);
});

test("failed calibration does not silently install a v2.1 default", () => {
  assert.equal(historicalV21Parameters, null);
  const input = buildMatchAnalysisInput(dataset, "home", "away"), result = createHistoricalV21MatchIntelligence(input, historicalV21Candidates[0]);
  assert.equal(result.modelVersion, HISTORICAL_V21_MODEL_VERSION);
  assert.ok(Math.abs(Object.values(result.probabilities).reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
  assert.equal(Object.values(result.probabilities).every((value) => Number.isFinite(value) && value >= 0 && value <= 1), true);
  const selected = Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(selected, result.probabilities.homeWin >= result.probabilities.draw && result.probabilities.homeWin >= result.probabilities.awayWin ? "homeWin" : result.probabilities.awayWin >= result.probabilities.draw ? "awayWin" : "draw");
});
