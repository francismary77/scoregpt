/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { DataProvenanceLabel } from "./data-provenance";
import type { FixtureSummary } from "@/modules/football-experience/types";

export function FootballFixtureCard({fixture}:{fixture:FixtureSummary}) {
  const hasScore=fixture.homeScore!==null||fixture.awayScore!==null;
  return <article className="football-fixture-card"><div className="football-card-meta"><span>{fixture.competition.name}</span><span className={`match-status ${fixture.status}`}>{fixture.status}</span></div><time dateTime={fixture.kickoffAt}>{fixture.displayKickoff}</time><div className="football-teams"><div><i>{fixture.homeTeam.logoUrl?<img src={fixture.homeTeam.logoUrl} alt=""/>:fixture.homeTeam.shortName?.slice(0,3)??fixture.homeTeam.name.slice(0,1)}</i><b>{fixture.homeTeam.name}</b></div><strong>{hasScore?<>{fixture.homeScore??"–"}<small>:</small>{fixture.awayScore??"–"}</>:"VS"}</strong><div><i>{fixture.awayTeam.logoUrl?<img src={fixture.awayTeam.logoUrl} alt=""/>:fixture.awayTeam.shortName?.slice(0,3)??fixture.awayTeam.name.slice(0,1)}</i><b>{fixture.awayTeam.name}</b></div></div><div className="football-card-foot"><DataProvenanceLabel source={fixture.provenance}/><Link href={`/matches/${fixture.id}`}>Match details →</Link></div></article>
}
