import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { aggregateBacktestReports, runHistoricalBacktest } = await import("../modules/football-backtesting/index.ts");

const teams = [{ id: "a", providerId: "1", name: "Alpha" }, { id: "b", providerId: "2", name: "Bravo" }];
const fixture = (index, homeScore, awayScore) => ({ id: `f${index}`, providerFixtureId: `f${index}`, homeTeamId: index % 2 ? "a" : "b", awayTeamId: index % 2 ? "b" : "a", homeScore, awayScore, kickoffAt: `2024-01-${String(index).padStart(2, "0")}T12:00:00Z`, status: "finished", round: "Regular" });
const fixtures = [[2, 0], [1, 1], [0, 1], [3, 1], [1, 2], [2, 2], [1, 0], [0, 2], [3, 0], [1, 1], [2, 1], [0, 1]].map((score, index) => fixture(index + 1, ...score));
const dataset = { competition: { id: "c", providerId: "179", name: "Premiership", country: "Scotland", season: "2024" }, teams, fixtures };

test("walk-forward evaluation reports eligibility and exclusions", () => {
  const report = runHistoricalBacktest(dataset, { minimumPriorMatches: 3 });
  assert.deepEqual([report.dataset.totalFixtures, report.dataset.eligibleFixtures, report.dataset.skippedFixtures], [12, 9, 3]);
  assert.equal(report.dataset.skippedReasons.both_teams_insufficient_history, 3);
});

test("target and later fixtures never enter point-in-time evidence", () => {
  const report = runHistoricalBacktest(dataset, { minimumPriorMatches: 3 }), target = report.predictions.find((item) => item.fixture.providerFixtureId === "f7");
  assert.ok(target); assert.equal(target.evidence.priorFixtureIds.includes("f7"), false); assert.equal(target.evidence.priorFixtureIds.includes("f8"), false);
  assert.ok(target.evidence.priorFixtureIds.every((id) => Number(id.slice(1)) < 7));
  assert.ok(new Date(target.evidence.latestDataDate).getTime() < new Date(target.fixture.kickoffAt).getTime());
});

test("same-kickoff fixtures are excluded from one another", () => {
  const sameKickoff = { ...dataset, fixtures: dataset.fixtures.map((item) => item.providerFixtureId === "f6" ? { ...item, kickoffAt: dataset.fixtures[6].kickoffAt } : item) };
  const target = runHistoricalBacktest(sameKickoff, { minimumPriorMatches: 3 }).predictions.find((item) => item.fixture.providerFixtureId === "f7");
  assert.equal(target.evidence.priorFixtureIds.includes("f6"), false);
});

test("target result and final-season future results cannot leak into prediction", () => {
  const original = runHistoricalBacktest(dataset, { minimumPriorMatches: 3 }).predictions.find((item) => item.fixture.providerFixtureId === "f7");
  const changed = { ...dataset, fixtures: dataset.fixtures.map((item) => item.providerFixtureId === "f7" ? { ...item, homeScore: 0, awayScore: 8 } : Number(item.providerFixtureId.slice(1)) > 7 ? { ...item, homeScore: 9, awayScore: 0 } : item) };
  const evaluated = runHistoricalBacktest(changed, { minimumPriorMatches: 3 }).predictions.find((item) => item.fixture.providerFixtureId === "f7");
  assert.deepEqual(evaluated.probabilities, original.probabilities); assert.deepEqual(evaluated.goalMarkets, original.goalMarkets); assert.deepEqual(evaluated.expectedGoals, original.expectedGoals);
  assert.notEqual(evaluated.actualOutcome, original.actualOutcome);
});

test("recent, H2H and venue samples are point-in-time samples", () => {
  const target = runHistoricalBacktest(dataset, { minimumPriorMatches: 3, recentN: 3 }).predictions.find((item) => item.fixture.providerFixtureId === "f7");
  assert.equal(target.evidence.recentSampleSize, 3); assert.equal(target.evidence.h2hSampleSize, 6); assert.equal(target.evidence.homeVenueSampleSize, 3); assert.equal(target.evidence.awayVenueSampleSize, 3);
});

test("backtest is deterministic and returns probability-quality metrics", () => {
  const first = runHistoricalBacktest(dataset, { minimumPriorMatches: 3 }), second = runHistoricalBacktest(dataset, { minimumPriorMatches: 3 });
  assert.deepEqual(first, second); assert.ok(first.oneXTwo.multiclassBrierScore >= 0); assert.ok(first.oneXTwo.logLoss >= 0);
  assert.equal(first.baselines.length, 2); assert.equal(first.calibration.reduce((sum, bucket) => sum + bucket.predictions, 0), first.dataset.eligibleFixtures);
});

test("goal markets, expectations, confidence and teams are evaluated", () => {
  const report = runHistoricalBacktest(dataset, { minimumPriorMatches: 3, marketThreshold: 0.5 });
  for (const market of Object.values(report.goalMarkets)) { assert.ok(market.predictions > 0); assert.ok(market.brierScore >= 0 && market.brierScore <= 1); assert.equal(market.threshold, 0.5); }
  assert.ok(report.goalExpectation.homeMae >= 0); assert.ok(report.goalExpectation.awayMae >= 0); assert.ok(report.goalExpectation.totalMae >= 0);
  assert.equal(Object.values(report.confidence).reduce((sum, item) => sum + item.predictions, 0), report.dataset.eligibleFixtures); assert.equal(report.teams.length, 2);
});

test("insufficient and incomplete histories degrade without fabricated evaluations", () => {
  const incomplete = { ...dataset, fixtures: [fixture(1, null, null)] };
  const report = runHistoricalBacktest(incomplete);
  assert.equal(report.dataset.completedFixtures, 0); assert.equal(report.dataset.eligibleFixtures, 0); assert.equal(report.oneXTwo.multiclassBrierScore, null); assert.equal(report.goalExpectation.totalMae, null);
});

test("multi-league aggregation preserves independent report boundaries", () => {
  const first = runHistoricalBacktest(dataset, { minimumPriorMatches: 3 }), other = { ...dataset, competition: { ...dataset.competition, id: "other", providerId: "140", name: "Other League" }, fixtures: dataset.fixtures.map((item) => ({ ...item, id: `o-${item.id}`, providerFixtureId: `o-${item.providerFixtureId}` })) }, second = runHistoricalBacktest(other, { minimumPriorMatches: 3 });
  const summary = aggregateBacktestReports([{ competitionId: "179", competitionName: "Premiership", report: first }, { competitionId: "140", competitionName: "Other League", report: second }]);
  assert.equal(summary.aggregate.predictions, first.dataset.eligibleFixtures + second.dataset.eligibleFixtures); assert.equal(summary.leagues[0].report.predictions.some((item) => item.fixture.providerFixtureId.startsWith("o-")), false); assert.equal(summary.leagues[1].report.predictions.every((item) => item.fixture.providerFixtureId.startsWith("o-")), true);
});
