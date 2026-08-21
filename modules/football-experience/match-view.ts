export type MatchView="all"|"today"|"upcoming"|"results";
export const FOOTBALL_TIME_ZONE="Africa/Lagos";
export function footballDate(value:Date|string=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:FOOTBALL_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value))}
export function parseMatchView(value:string|null|undefined):MatchView{return value==="today"||value==="upcoming"||value==="results"?value:"all"}
