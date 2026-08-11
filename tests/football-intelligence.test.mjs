import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { buildMatchAnalysisInput } = await import("../modules/football-data/historical.ts");
const { createHistoricalMatchIntelligence, HISTORICAL_MODEL_VERSION, historicalModelWeights } = await import("../modules/football-intelligence/index.ts");

const competition = { id: "league", providerId: "179", name: "Premiership", country: "Scotland", season: "2024" };
const teams = [{ id: "home", providerId: "1", name: "Home" }, { id: "away", providerId: "2", name: "Away" }, { id: "other", providerId: "3", name: "Other" }];
const fixture = (id, homeTeamId, awayTeamId, homeScore, awayScore, day, status = "finished") => ({ id, providerFixtureId: id, homeTeamId, awayTeamId, homeScore, awayScore, kickoffAt: `2024-01-${String(day).padStart(2, "0")}T12:00:00Z`, status, round: "Regular" });
const dataset = { competition, teams, fixtures: [
  fixture("1", "home", "away", 3, 1, 1), fixture("2", "away", "home", 0, 0, 2),
  fixture("3", "home", "other", 2, 0, 3), fixture("4", "other", "away", 2, 1, 4),
  fixture("5", "home", "away", 2, 2, 5), fixture("6", "away", "home", 1, 0, 6),
  fixture("7", "home", "other", 4, 1, 7), fixture("8", "away", "other", 1, 3, 8),
  fixture("9", "other", "home", 0, 2, 9), fixture("10", "other", "away", 1, 1, 10),
] };
const input = buildMatchAnalysisInput(dataset, "home", "away", { recentN: 5 });

test("model weights are explicit, normalized and versioned", () => {
  const scoringTotal = Object.entries(historicalModelWeights).filter(([key]) => key !== "h2hMaximumAdjustment").reduce((sum, [, value]) => sum + value, 0);
  assert.ok(Math.abs(scoringTotal - 1) < 1e-12); assert.equal(HISTORICAL_MODEL_VERSION, "historical-v1");
});

test("1X2 and BTTS probabilities obey invariants", () => {
  const result = createHistoricalMatchIntelligence(input), values = [...Object.values(result.probabilities), ...Object.values(result.goalMarkets).filter((value) => value !== null)];
  assert.ok(Math.abs(Object.values(result.probabilities).reduce((sum, value) => sum + value, 0) - 1) < 1e-6);
  assert.ok(Math.abs(result.goalMarkets.bttsYes + result.goalMarkets.bttsNo - 1) < 1e-6);
  assert.ok(values.every((value) => value >= 0 && value <= 1));
});

test("identical input and model version produce identical output", () => {
  assert.deepEqual(createHistoricalMatchIntelligence(input), createHistoricalMatchIntelligence(input));
});

test("swapping teams recomputes role-specific home and away evidence", () => {
  const original = createHistoricalMatchIntelligence(input), swapped = createHistoricalMatchIntelligence(buildMatchAnalysisInput(dataset, "away", "home", { recentN: 5 }));
  assert.equal(swapped.homeTeam.id, original.awayTeam.id); assert.equal(swapped.awayTeam.id, original.homeTeam.id);
  assert.notEqual(swapped.strength.home, original.strength.away);
  assert.notEqual(swapped.goalExpectation.expectedHomeGoals, original.goalExpectation.expectedAwayGoals);
});

test("missing H2H and limited form degrade safely", () => {
  const limited = { competition, teams, fixtures: [fixture("one", "home", "other", 1, 0, 1), fixture("two", "away", "other", 0, 1, 2)] };
  const result = createHistoricalMatchIntelligence(buildMatchAnalysisInput(limited, "home", "away", { recentN: 5 }));
  assert.equal(result.dataQuality.h2hSampleSize, 0); assert.equal(result.confidence, "low"); assert.ok(result.supportingFactors.some((factor) => factor.type === "limited_h2h_sample"));
});

test("zero-match and incomplete-score inputs remain neutral and honest", () => {
  const empty = { competition, teams: teams.slice(0, 2), fixtures: [fixture("future", "home", "away", null, null, 1, "scheduled")] };
  const result = createHistoricalMatchIntelligence(buildMatchAnalysisInput(empty, "home", "away"));
  assert.ok(Math.abs(result.probabilities.homeWin - result.probabilities.awayWin) <= 0.0001);
  assert.equal(result.confidence, "low"); assert.equal(result.goalExpectation.expectedTotalGoals, null); assert.equal(result.goalMarkets.over25, null);
});

test("result contains model-derived goal expectations and structured factors", () => {
  const result = createHistoricalMatchIntelligence(input);
  assert.ok(result.goalExpectation.expectedHomeGoals >= 0); assert.ok(result.goalExpectation.expectedAwayGoals >= 0); assert.equal(result.goalExpectation.methodology, "historical-scoring-conceding-rates");
  assert.ok(result.supportingFactors.every((factor) => factor.type && factor.context && factor.direction && factor.strength && factor.summary));
  assert.doesNotMatch(JSON.stringify(result), /guaranteed|sure win|banker|fixed|100% certain/i);
});
