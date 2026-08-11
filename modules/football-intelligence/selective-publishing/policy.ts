export const SELECTIVE_PUBLISHING_V1 = Object.freeze({
  policyId: "selective-publishing-v1",
  predictionMethodology: "historical-v1",
  confidenceMethodology: "historical-v1-confidence-v1",
  rankingPopulation: "DAILY_GLOBAL" as const,
  topPickCoverage: .2,
  minimumEligiblePopulationForTopPicks: 5,
  minimumTeamHistory: 5,
  probabilityTolerance: 1e-6,
  confidenceLabelsEnabled: true,
  confidencePercentiles: Object.freeze({ lowUpper: 1 / 3, moderateUpper: 2 / 3 }),
});
