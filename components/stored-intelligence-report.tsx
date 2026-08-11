import type { IntelligenceReportSummary, PredictionMarketSummary } from "@/modules/football-experience/types";
import { parseFrozenForwardReportContent } from "@/modules/football-experience/report-content";
import { DataProvenanceLabel } from "./data-provenance";
import { ShareReport } from "./share-report";

const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;
const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());

export function StoredIntelligenceReport({ report, markets }: { report: IntelligenceReportSummary; markets: PredictionMarketSummary[] }) {
  const frozen = report.forwardPrediction ? parseFrozenForwardReportContent(report.analysis) : null;
  return <><DataProvenanceLabel source={report.provenance}/><h3>{report.headline}</h3>{report.excerpt && <p>{report.excerpt}</p>}<ShareReport title={report.headline}/>
    {report.forwardPrediction ? frozen ? <>
      <h4>Frozen model output</h4><dl><div><dt>Selected outcome</dt><dd>{label(frozen.selectedOutcome)}</dd></div><div><dt>Confidence label</dt><dd>{label(frozen.confidenceLabel)}</dd></div><div><dt>Analysis tier</dt><dd>{label(frozen.publicationTier)}</dd></div></dl>
      <h4>1X2 probabilities</h4><dl><div><dt>Home</dt><dd>{percent(frozen.probabilities.home)}</dd></div><div><dt>Draw</dt><dd>{percent(frozen.probabilities.draw)}</dd></div><div><dt>Away</dt><dd>{percent(frozen.probabilities.away)}</dd></div></dl>
      <h4>Evidence provenance</h4><dl><div><dt>Methodology</dt><dd>{frozen.methodologyVersion}</dd></div><div><dt>Evidence cutoff</dt><dd><time dateTime={frozen.evidenceCutoffAt}>{new Date(frozen.evidenceCutoffAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}</time></dd></div></dl>
    </> : <p>Verified model detail is unavailable. No generic fixture analysis is substituted.</p> : <>
      <h4>Why this prediction?</h4><p>{report.excerpt ?? "The available demonstration indicators support the recommended market."}</p>
      <h4>Team comparison</h4><p>Recent form, scoring output and defensive consistency are compared without treating missing data as zero.</p>
      <h4>Tactical outlook</h4><p>The report considers likely possession, pressing and transition patterns from the available demonstration information.</p>
      <h4>Expected match flow</h4><p>This demonstration projection describes the most likely pattern rather than a guaranteed outcome.</p>
      {report.confidenceExplanation && <><h4>Confidence explanation</h4><p>{report.confidenceExplanation}</p></>}
      {report.riskExplanation && <><h4>Risk explanation</h4><p>{report.riskExplanation}</p></>}
    </>}
    <dl><div><dt>Recommended market</dt><dd>{report.recommendedMarket ?? "Unavailable"}</dd></div><div><dt>Confidence</dt><dd>{report.confidence === null ? "Unavailable" : `${report.confidence}%`}</dd></div><div><dt>Risk</dt><dd>{report.riskLevel ?? "Unavailable"}</dd></div></dl>
    <h4>Markets analysed</h4>{markets.length ? <div className="stored-market-list">{markets.map((item) => <article key={item.id}><span>{item.market}</span><b>{item.prediction}</b><small>{item.confidence}% · {item.riskLevel} risk</small><p>{item.reasoning}</p></article>)}</div> : <p>No prediction markets are stored for this report.</p>}
    {!report.forwardPrediction && <><h4>Markets to avoid</h4><p>Correct Score and First Goalscorer carry high uncertainty in this demonstration.</p></>}
    <p className="ai-transparency">This is AI-assisted football intelligence. Predictions are probabilistic, outcomes are never guaranteed, and users should bet responsibly.</p>
  </>;
}
