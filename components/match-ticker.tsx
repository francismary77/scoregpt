interface TickerMatch { competition: string; fixture: string; kickoff: string }

export function MatchTicker({ matches }: { matches: readonly TickerMatch[] }) {
  const feed = [...matches, ...matches];
  return (
    <section className="match-ticker" aria-label="Football intelligence feed">
      <div className="container ticker-shell">
        <span className="ticker-label"><i /> Match feed</span>
        <div className="ticker-window" tabIndex={0} aria-label="Pause the animated match feed by focusing this area">
          <div className="ticker-track">
            {feed.map((match, index) => <div className="ticker-item" key={`${match.fixture}-${index}`} aria-hidden={index >= matches.length}>
              <span>{match.competition}</span><b>{match.fixture}</b><time>{match.kickoff}</time><i>AI review</i>
            </div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
