/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { footballCompetitions } from "@/config/football-data";
import type { CompetitionSummary } from "@/modules/football-experience/types";
import { DataProvenanceLabel } from "./data-provenance";

const publicId = (item: CompetitionSummary) => footballCompetitions.find((configured) => configured.name === item.name)?.id ?? item.id;

export function CompetitionGrid({ competitions, compact = false }: { competitions: CompetitionSummary[]; compact?: boolean }) {
  return <div className={`competition-experience-grid ${compact ? "compact" : ""}`}>{competitions.map((item) => <article key={item.id}><div><i>{item.logoUrl ? <img src={item.logoUrl} alt=""/> : item.country.slice(0, 2).toUpperCase()}</i><span className={`availability ${item.availability}`}>{item.availability.replace("-", " ")}</span></div><h3>{item.name}</h3><p>{item.country}{item.season ? ` · ${item.season}` : ""}</p>{!compact && <><small>{item.fixtureCount === undefined ? "Fixture availability will update as coverage rolls out." : `${item.fixtureCount} fixture${item.fixtureCount === 1 ? "" : "s"} available`}</small><div><DataProvenanceLabel source={item.provenance}/><Link href={`/competitions/${publicId(item)}`}>View competition →</Link></div></>}</article>)}</div>;
}
