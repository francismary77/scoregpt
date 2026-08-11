export interface ScorelineProbability { homeGoals: number; awayGoals: number; probability: number }
export interface ScoreMatrix { maximumGoals: number; residualTail: number; normalization: number; scorelines: ScorelineProbability[] }

const poisson = (goals: number, lambda: number) => { let factorial = 1; for (let value = 2; value <= goals; value++) factorial *= value; return Math.exp(-lambda) * lambda ** goals / factorial; };

export function createPoissonScoreMatrix(homeLambda: number, awayLambda: number): ScoreMatrix {
  let maximumGoals = 8;
  const tail = (lambda: number, maximum: number) => 1 - Array.from({ length: maximum + 1 }, (_, goals) => poisson(goals, lambda)).reduce((sum, value) => sum + value, 0);
  while (maximumGoals < 14 && tail(homeLambda, maximumGoals) + tail(awayLambda, maximumGoals) > 1e-7) maximumGoals++;
  const scorelines: ScorelineProbability[] = [];
  for (let homeGoals = 0; homeGoals <= maximumGoals; homeGoals++) for (let awayGoals = 0; awayGoals <= maximumGoals; awayGoals++) scorelines.push({ homeGoals, awayGoals, probability: poisson(homeGoals, homeLambda) * poisson(awayGoals, awayLambda) });
  const normalization = scorelines.reduce((sum, score) => sum + score.probability, 0), residualTail = Math.max(0, 1 - normalization);
  return { maximumGoals, residualTail, normalization, scorelines: scorelines.map((score) => ({ ...score, probability: score.probability / normalization })) };
}
