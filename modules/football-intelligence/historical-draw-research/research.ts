import type { HistoricalDataset } from "@/modules/football-data/historical";
import { runHistoricalBacktest } from "@/modules/football-backtesting";
import { calibrationPartition } from "../historical-v2";
import { calculateStructuralDrawFeatures } from "./features";

export function structuralResearchPartitions(dataset: HistoricalDataset, league: string) { const manifest = calibrationPartition(runHistoricalBacktest(dataset).predictions), lockedIds = new Set(manifest.lockedReference.map((item) => item.fixture.providerFixtureId)), researchDataset = { ...dataset, fixtures: dataset.fixtures.filter((fixture) => !lockedIds.has(fixture.providerFixtureId)) }; return { development: manifest.development.map((prediction) => calculateStructuralDrawFeatures(researchDataset, prediction, league)), calibration: manifest.calibration.map((prediction) => calculateStructuralDrawFeatures(researchDataset, prediction, league)), lockedCount: manifest.lockedReference.length }; }
