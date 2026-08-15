export type EvaluationCohort = "TOP_20" | "WATCHLIST_20" | "REMAINDER";

export interface EvaluationRank {
  evaluationRank: number;
  evaluationPopulationSize: number;
  evaluationPercentile: number;
  evaluationCohort: EvaluationCohort;
}

export function assignEvaluationCohorts<T extends { id: string; confidence: number }>(rows: readonly T[]): Map<string, EvaluationRank> {
  const ordered = [...rows].sort((a,b)=>b.confidence-a.confidence||a.id.localeCompare(b.id));
  const population=ordered.length,topBoundary=Math.ceil(population*.2),watchBoundary=Math.ceil(population*.4),result=new Map<string,EvaluationRank>();
  let rank=0,prior:number|undefined;
  ordered.forEach((row,index)=>{if(prior===undefined||row.confidence!==prior)rank=index+1;prior=row.confidence;const cohort:EvaluationCohort=rank<=topBoundary?"TOP_20":rank<=watchBoundary?"WATCHLIST_20":"REMAINDER";result.set(row.id,{evaluationRank:rank,evaluationPopulationSize:population,evaluationPercentile:population?((rank-1)/population)*100:0,evaluationCohort:cohort});});
  return result;
}

