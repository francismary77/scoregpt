import "@/lib/server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/database.types";
import {ApiFootballProvider} from "@/modules/football-data/api-football-provider";
import {SupabaseProviderRequestRepository} from "@/modules/persistence/football-repositories";

const targets=[
  {id:"premier-league",country:"England",name:/^Premier League$/i,expected:"39"},
  {id:"la-liga",country:"Spain",name:/^La Liga$/i,expected:"140"},
  {id:"serie-a",country:"Italy",name:/^Serie A$/i,expected:"135"},
  {id:"bundesliga",country:"Germany",name:/^Bundesliga$/i,expected:"78"},
  {id:"ligue-1",country:"France",name:/^Ligue 1$/i,expected:"61"},
  {id:"turkish-super-lig",country:"Turkey",name:/^(Super Lig|Süper Lig)$/i,expected:null},
] as const;

export async function verifyTargetCompetitions(client:SupabaseClient<Database>,env:NodeJS.ProcessEnv=process.env){
  if(env.FOOTBALL_COMPETITION_VERIFICATION_ENABLED!=="true")return{status:"SKIPPED" as const,providerRequests:0,examined:0,changed:0,summary:{reason:"COMPETITION_VERIFICATION_DISABLED",competitions:[]}};
  const max=Number.parseInt(env.FOOTBALL_MAX_PROVIDER_REQUESTS_PER_RUN??"",10);if(!Number.isInteger(max)||max<targets.length||max>10)throw new Error("Competition verification request budget is invalid.");
  const audits:unknown[]=[],provider=new ApiFootballProvider({apiKey:env.FOOTBALL_API_KEY?.trim()||null,enabled:env.FOOTBALL_DATA_PROVIDER==="api-football"&&env.FOOTBALL_DATA_PROVIDER_ENABLED==="true",onRequest:a=>audits.push(a)}),requests=new SupabaseProviderRequestRepository(client),rows=[];
  for(const target of targets){const requestedAt=new Date().toISOString();try{const candidates=await provider.discoverCompetitions({country:target.country,season:"2026"});const matches=candidates.flatMap(candidate=>candidate.seasons.filter(season=>season.year==="2026"&&season.start&&season.end).map(season=>({candidate,season}))).filter(({candidate})=>target.name.test(candidate.name.trim())&&(!target.expected||candidate.providerId===target.expected));if(matches.length!==1)throw new Error("Competition verification was not unambiguous.");const {candidate,season}=matches[0];const saved=await client.from("football_competition_verifications").upsert({provider:"api-football",internal_competition_id:target.id,provider_competition_id:candidate.providerId,provider_name:candidate.name,country:candidate.country,competition_type:candidate.type,season:"2026",season_start:season.start,season_end:season.end,verified_at:requestedAt},{onConflict:"provider,internal_competition_id,season"});if(saved.error)throw new Error("Competition verification persistence failed.");await requests.recordRequest({provider:"api-football",category:"competition",endpoint:`leagues-verification:${target.id}-2026`,requestedAt,requestCount:1,succeeded:true,cacheState:"missing",refreshReason:"manual",errorCode:null});rows.push({competition:target.id,providerId:candidate.providerId,season:"2026",verified:true});}catch(error){await requests.recordRequest({provider:"api-football",category:"competition",endpoint:`leagues-verification:${target.id}-2026`,requestedAt,requestCount:1,succeeded:false,cacheState:"missing",refreshReason:"manual",errorCode:error instanceof Error?error.name:"VerificationError"});rows.push({competition:target.id,providerId:null,season:"2026",verified:false});}}
  return{status:rows.every(row=>row.verified)?"COMPLETED" as const:"SKIPPED" as const,providerRequests:audits.length,examined:targets.length,changed:rows.filter(row=>row.verified).length,summary:{reason:null,competitions:rows}};
}
