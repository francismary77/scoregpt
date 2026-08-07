import type { MatchPreview } from "@/lib/types";
export function MatchCard({ match }: { match: MatchPreview }) {
  return <article className="match-card"><div className="match-top"><span>{match.competition}</span><span>{match.kickoff}</span></div><div className="teams"><strong>{match.home}</strong><span>VS</span><strong>{match.away}</strong></div><div className="prediction"><div><small>AI insight</small><b>{match.insight}</b></div><div className="confidence"><small>Confidence</small><b>{match.confidence}%</b></div></div><div className="confidence-bar"><i style={{ width: `${match.confidence}%` }} /></div></article>;
}
