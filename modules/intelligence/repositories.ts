import type { Competition, Fixture, Prediction, ResultRecord } from "./domain";
export interface FixtureRepository { getFeaturedFixture(): Fixture | null; getFixturesForDate(date?: string): Fixture[]; getFixtureById(id: string): Fixture | null; getFixturesByCompetition(competitionId: string): Fixture[] }
export interface PredictionRepository { getPredictionForFixture(fixtureId: string): Prediction | null; getFeaturedPrediction(): Prediction | null; getPredictionsForDate(date?: string): Prediction[] }
export interface CompetitionRepository { getSupportedCompetitions(): Competition[]; getCompetitionById(id: string): Competition | null }
export interface ResultsRepository { getRecentResults(limit?: number): ResultRecord[]; getResultByPredictionId(predictionId: string): ResultRecord | null }
