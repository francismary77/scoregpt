import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { buildMatchAnalysisInput, calculateGoalTrends, calculateHeadToHead, calculateHistoricalStandings, calculateTeamHistoricalProfile, classifyDataCompleteness, classifyParticipants } = await import("../modules/football-data/historical.ts");

const teams = ["Alpha", "Bravo", "Charlie", "Delta"].map((name, index) => ({ id: `${index + 1}`, providerId: `${index + 1}`, name }));
const fixture = (id, home, away, hs, as, date, round = "Regular - 1", status = "finished") => ({ id, providerFixtureId: id, homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, kickoffAt: date, round, status });
const dataset = { competition: { id: "c", providerId: "179", name: "Premiership", country: "Scotland", season: "2024" }, teams, fixtures: [
  fixture("f1", "1", "2", 2, 0, "2024-01-01T12:00:00Z"),
  fixture("f2", "3", "1", 1, 1, "2024-01-02T12:00:00Z"),
  fixture("f3", "2", "3", 3, 2, "2024-01-03T12:00:00Z"),
  fixture("f4", "1", "2", 1, 1, "2024-01-04T12:00:00Z"),
  fixture("f5", "4", "3", 2, 1, "2024-02-01T12:00:00Z", "Relegation Round"),
] };

test("calculated standings use points, goal difference and goals-for tie breakers", () => {
  const table = calculateHistoricalStandings(dataset);
  assert.deepEqual(table.map((row) => row.team.name), ["Alpha", "Bravo", "Charlie"]);
  assert.deepEqual(table.map((row) => row.points), [5, 4, 1]);
  assert.equal(table[0].goalDifference, 2);
  const tied = { ...dataset, fixtures: [fixture("a", "1", "3", 2, 0, "2024-01-01T00:00:00Z"), fixture("b", "2", "3", 3, 1, "2024-01-02T00:00:00Z")] };
  assert.equal(calculateHistoricalStandings(tied)[0].team.name, "Bravo");
});

test("participants distinguish regular, playoff-only and unknown without deleting teams", () => {
  const types = classifyParticipants({ ...dataset, teams: [...teams, { id: "5", providerId: "5", name: "Unknown" }] });
  assert.equal(types.get("1"), "regular"); assert.equal(types.get("4"), "playoff_only"); assert.equal(types.get("5"), "unknown");
  assert.equal(calculateHistoricalStandings(dataset).some((row) => row.team.id === "4"), false);
});

test("team profiles cover overall, home, away and recent form", () => {
  const profile = calculateTeamHistoricalProfile(dataset, "1");
  assert.deepEqual([profile.played, profile.wins, profile.draws, profile.losses, profile.goalsFor, profile.goalsAgainst, profile.points], [3, 1, 2, 0, 4, 2, 5]);
  assert.deepEqual([profile.home.played, profile.home.wins, profile.home.draws], [2, 1, 1]);
  assert.deepEqual([profile.away.played, profile.away.draws], [1, 1]);
  assert.deepEqual(profile.recent5.sequence, ["D", "D", "W"]);
});

test("H2H provides descriptive goal, result, BTTS and over-goal summaries", () => {
  const h2h = calculateHeadToHead(dataset, "1", "2");
  assert.deepEqual([h2h.totalMeetings, h2h.firstTeamWins, h2h.draws, h2h.secondTeamWins], [2, 1, 1, 0]);
  assert.deepEqual([h2h.firstTeamGoals, h2h.secondTeamGoals, h2h.over15.count, h2h.over25.count, h2h.btts.count], [3, 1, 2, 0, 1]);
  assert.equal(h2h.recentMeetings[0].id, "f4");
});

test("goal trends support home, away and recent windows", () => {
  const overall = calculateGoalTrends(dataset, "1"), home = calculateGoalTrends(dataset, "1", { venue: "home" }), recent = calculateGoalTrends(dataset, "1", { recentN: 1 });
  assert.deepEqual([overall.over05.count, overall.over15.count, overall.over25.count, overall.over35.count], [3, 3, 0, 0]);
  assert.deepEqual([overall.btts.count, overall.cleanSheet.count, overall.failedToScore.count], [2, 1, 0]);
  assert.equal(home.sampleSize, 2); assert.equal(recent.sampleSize, 1);
});

test("empty, incomplete and one-match histories are safe", () => {
  const empty = { competition: dataset.competition, teams: [teams[0]], fixtures: [] }, profile = calculateTeamHistoricalProfile(empty, "1"), trends = calculateGoalTrends(empty, "1");
  assert.equal(profile.goalsPerMatch, null); assert.equal(profile.winPercentage, null); assert.equal(trends.btts.rate, null);
  const incomplete = { ...empty, fixtures: [fixture("x", "1", "2", null, null, "2024-01-01T00:00:00Z", "Regular", "scheduled")] };
  assert.equal(calculateTeamHistoricalProfile(incomplete, "1").played, 0);
  const one = { competition: dataset.competition, teams: teams.slice(0, 2), fixtures: [fixture("y", "1", "2", 1, 0, "2024-01-01T00:00:00Z")] };
  assert.equal(calculateTeamHistoricalProfile(one, "1").winPercentage, 1);
});

test("data completeness rules and MatchAnalysisInput are deterministic", () => {
  assert.deepEqual([classifyDataCompleteness(20, 5, 3), classifyDataCompleteness(8, 3, 1), classifyDataCompleteness(7, 2, 0)], ["strong", "moderate", "limited"]);
  const input = buildMatchAnalysisInput(dataset, "1", "2", { recentN: 2, analysisDate: "2024-02-01T00:00:00Z" });
  assert.equal(input.competition.providerId, "179"); assert.equal(input.season, "2024"); assert.equal(input.homeTeam.profile.team.name, "Alpha"); assert.equal(input.awayTeam.profile.team.name, "Bravo"); assert.equal(input.context.h2hSampleSize, 2); assert.equal(input.context.latestDataDate, "2024-01-04T12:00:00Z");
});
