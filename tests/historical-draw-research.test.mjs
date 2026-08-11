import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";

const { runHistoricalBacktest } = await import("../modules/football-backtesting/engine.ts");
const { calculateStructuralDrawFeatures, deriveDrawLikeThresholds, structuralResearchPartitions } = await import("../modules/football-intelligence/historical-draw-research/index.ts");

const competition = { id: "research", providerId: "research", name: "Research League", country: "Test", season: "2024" };
const teams = ["a", "b", "c", "d"].map((id, index) => ({ id, providerId: String(index + 1), name: id }));
const fixture = (index, homeTeamId, awayTeamId, homeScore, awayScore, hour = 12) => ({ id: `f${index}`, providerFixtureId: `f${index}`, homeTeamId, awayTeamId, homeScore, awayScore, kickoffAt: `2024-01-${String(index).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`, status: "finished", round: "Regular" });
const schedule = Array.from({ length: 24 }, (_, index) => { const pairs = [["a", "b"], ["c", "d"], ["a", "c"], ["b", "d"], ["a", "d"], ["b", "c"]], [home, away] = pairs[index % pairs.length], scores = [[1, 1], [2, 0], [0, 1], [2, 2], [1, 0], [0, 0]][index % 6]; return fixture(index + 1, home, away, scores[0], scores[1]); });
const dataset = { competition, teams, fixtures: schedule };
const targetPrediction = (source = dataset, id = "f20") => runHistoricalBacktest(source, { minimumPriorMatches: 3 }).predictions.find((prediction) => prediction.fixture.id === id);
const targetFeatures = (source = dataset, id = "f20") => calculateStructuralDrawFeatures(source, targetPrediction(source, id), "Research League");

test("structural features are deterministic, typed and finite where available", () => {
  const first = targetFeatures(), second = targetFeatures();
  assert.deepEqual(first, second);
  assert.ok(Object.values(first.features).every((value) => value === null || Number.isFinite(value)));
  assert.ok(first.evidence.homeOverall >= 3 && first.evidence.awayOverall >= 3);
});

test("changing target result or score cannot alter structural features", () => {
  const changed = { ...dataset, fixtures: dataset.fixtures.map((item) => item.id === "f20" ? { ...item, homeScore: 9, awayScore: 8 } : item) };
  assert.deepEqual(targetFeatures().features, targetFeatures(changed).features);
});

test("same-kickoff result cannot alter target structural features", () => {
  const same = { ...dataset, fixtures: dataset.fixtures.map((item) => item.id === "f19" ? { ...item, kickoffAt: dataset.fixtures[19].kickoffAt } : item) }, changed = { ...dataset, fixtures: dataset.fixtures.map((item) => item.id === "f19" ? { ...item, kickoffAt: dataset.fixtures[19].kickoffAt, homeScore: 20, awayScore: 0 } : item) };
  assert.deepEqual(targetFeatures(same).features, targetFeatures(changed).features);
});

test("later results and removal of future fixtures cannot alter earlier features", () => {
  const changed = { ...dataset, fixtures: dataset.fixtures.map((item) => Number(item.id.slice(1)) > 20 ? { ...item, homeScore: 20, awayScore: 0 } : item) }, removed = { ...dataset, fixtures: dataset.fixtures.filter((item) => Number(item.id.slice(1)) <= 20) };
  assert.deepEqual(targetFeatures().features, targetFeatures(changed).features);
  assert.deepEqual(targetFeatures().features, targetFeatures(removed).features);
});

test("league and season research partitions remain isolated", () => {
  const other = { ...dataset, competition: { ...competition, id: "other", providerId: "other", season: "2023" }, fixtures: dataset.fixtures.map((item) => ({ ...item, id: `o-${item.id}`, providerFixtureId: `o-${item.providerFixtureId}` })) };
  const first = structuralResearchPartitions(dataset, "2024"), second = structuralResearchPartitions(other, "2023");
  assert.ok(first.development.every((row) => !row.fixtureId.startsWith("o-")));
  assert.ok(second.development.every((row) => row.fixtureId.startsWith("o-")));
});

test("locked reference fixtures cannot enter development feature generation", () => {
  const manifest = runHistoricalBacktest(dataset).predictions, cutoff = Math.floor(manifest.length * .7), locked = new Set(manifest.slice(cutoff).map((prediction) => prediction.fixture.providerFixtureId)), research = structuralResearchPartitions(dataset, "Research League");
  assert.equal(research.lockedCount, manifest.length - cutoff);
  assert.ok(research.development.every((row) => !locked.has(row.fixtureId)));
});

test("calibration outcomes cannot influence development thresholds", () => {
  const base = structuralResearchPartitions(dataset, "Research League"), calibrationIds = new Set(base.calibration.map((row) => row.fixtureId)), changed = { ...dataset, fixtures: dataset.fixtures.map((item) => calibrationIds.has(item.providerFixtureId) ? { ...item, homeScore: 20, awayScore: 0 } : item) }, altered = structuralResearchPartitions(changed, "Research League");
  assert.deepEqual(deriveDrawLikeThresholds(base.development), deriveDrawLikeThresholds(altered.development));
  assert.deepEqual(base.development.map((row) => row.features), altered.development.map((row) => row.features));
});

test("sparse-history fallbacks are deterministic and never fabricate missing evidence", () => {
  const short = { ...dataset, fixtures: dataset.fixtures.slice(0, 8) }, prediction = runHistoricalBacktest(short, { minimumPriorMatches: 1 }).predictions.at(-1), first = calculateStructuralDrawFeatures(short, prediction, "Research League"), second = calculateStructuralDrawFeatures(short, prediction, "Research League");
  assert.deepEqual(first, second);
  assert.ok(Object.values(first.evidence).every((count) => Number.isInteger(count) && count >= 0));
});

test("research tooling has no persistence or publication dependency", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../modules/football-intelligence/historical-draw-research/research.ts", import.meta.url), "utf8"));
  assert.doesNotMatch(source, /\.insert\s*\(|\.upsert\s*\(|publish\s*\(|fetch\s*\(|modules\/persistence|football-provider/i);
});
