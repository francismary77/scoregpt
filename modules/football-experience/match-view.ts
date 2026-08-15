export type MatchView="all"|"today"|"upcoming"|"results";
export function parseMatchView(value:string|null|undefined):MatchView{return value==="today"||value==="upcoming"||value==="results"?value:"all"}
