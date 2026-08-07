interface MatchPreview { id:string; competition:string; home:string; away:string; kickoff:string; insight:string; confidence:number; risk:"Low"|"Medium"|"High" }
export function MatchCard({ match }: { match: MatchPreview }) {
  const initials = (team: string) => team.split(" ").map((word) => word[0]).join("").slice(0, 2);
  return <article className="match-card">
    <div className="card-data-grid" aria-hidden="true" />
    <div className="match-top"><span>{match.competition}</span><time>{match.kickoff}</time></div>
    <div className="teams"><div><i className="mini-team-badge">{initials(match.home)}</i><strong>{match.home}</strong><span className="form-dots" aria-label="Recent form: mixed"><i/><i/><i/></span></div><span className="versus-mini">VS</span><div><i className="mini-team-badge away">{initials(match.away)}</i><strong>{match.away}</strong><span className="form-dots away" aria-label="Recent form: positive"><i/><i/><i/></span></div></div>
    <div className="prediction"><div><small>AI prediction</small><b>{match.insight}</b></div><div className="confidence"><small>Confidence</small><b>{match.confidence}%</b></div></div>
    <div className="confidence-bar" aria-label={`${match.confidence}% confidence`}><i style={{ "--confidence": `${match.confidence}%` } as React.CSSProperties} /></div>
    <div className="match-card-foot"><span className={`risk-badge ${match.risk.toLowerCase()}`}><i/> {match.risk} risk</span><span className="mini-spark" aria-hidden="true"><i/><i/><i/><i/><i/></span><small>Demo analysis</small></div>
  </article>;
}
