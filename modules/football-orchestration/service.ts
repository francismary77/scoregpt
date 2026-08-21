import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database,Json } from "@/lib/supabase/database.types";
import { footballDataConfig } from "@/config/football-data";
import { getServerFootballProviderConfig } from "@/modules/football-data/server-config";
import { ApiFootballProvider } from "@/modules/football-data/api-football-provider";
import { FootballDataIngestionService } from "@/modules/football-data/service";
import { SupabaseFootballIngestionRepository,SupabaseProviderRequestRepository } from "@/modules/persistence/football-repositories";
import { SupabaseShadowPredictionRepository,SupabaseShadowRunRepository } from "@/modules/persistence/shadow-repositories";
import { loadPersistedShadowFixtureSources } from "@/modules/persistence/shadow-fixture-source";
import { settleShadowPrediction } from "@/modules/football-intelligence/shadow-pipeline";
import { getShadowPipelineControls,getSupportedShadowCompetitions } from "@/modules/football-intelligence/shadow-pipeline/config";
import { runRollingShadowWorker } from "@/modules/football-intelligence/rolling-readiness";
import { ConsumerPredictionPublicationService } from "@/modules/consumer-publication/service";
import { getFootballOrchestrationConfig } from "./config";
import {verifyTargetCompetitions} from "./competition-verification";
import {historicalLeagueTargets,ingestHistoricalLeague} from "@/modules/football-data/historical-expansion";
export type FootballJob="verification"|"ingestion"|"enrichment"|"prediction"|"publication"|"settlement";
type JobResult={status:"COMPLETED"|"SKIPPED";providerRequests:number;examined:number;changed:number;summary:Record<string,Json>};
export class FootballProductionOrchestrator{
 constructor(private readonly client:SupabaseClient<Database>,private readonly env:NodeJS.ProcessEnv=process.env){}
 async run(job:FootballJob){const config=getFootballOrchestrationConfig(this.env),dryRun=job==="ingestion"?config.ingestionDryRun:false,begun=await this.client.rpc("begin_football_orchestration_run",{p_job:job,p_environment:config.environment,p_dry_run:dryRun,p_stale_after_minutes:30});if(begun.error)throw new Error("Football orchestration lock failed.");if(!begun.data)return{status:"OVERLAPPING_RUN_SKIPPED" as const,job};try{const result=await this.execute(job);await this.finish(begun.data,result.status,result.providerRequests,result.examined,result.changed,result.summary,null);return{job,...result};}catch(error){const providerRequests=typeof error==="object"&&error&&"providerRequestsConsumed" in error&&typeof error.providerRequestsConsumed==="number"?error.providerRequestsConsumed:0;await this.finish(begun.data,"FAILED",providerRequests,0,0,{},error instanceof Error?error.name:"ORCHESTRATION_ERROR");throw error}}
 private async finish(id:string,status:string,providerRequests:number,examined:number,changed:number,summary:Record<string,Json>,errorCode:string|null){const done=await this.client.rpc("finish_football_orchestration_run",{p_run_id:id,p_status:status,p_provider_requests:providerRequests,p_records_examined:examined,p_records_changed:changed,p_summary:summary,p_error_code:errorCode});if(done.error||done.data!==true)throw new Error("Football orchestration audit completion failed.")}
 private execute(job:FootballJob){if(job==="verification")return verifyTargetCompetitions(this.client,this.env);if(job==="ingestion")return this.env.FOOTBALL_HISTORICAL_INGESTION_ENABLED==="true"?this.ingestHistorical():this.ingest();if(job==="enrichment")return this.enrich();if(job==="prediction")return this.predict();if(job==="publication")return this.publish();return this.settle()}
 private async ingestHistorical():Promise<JobResult>{
  const controls=getFootballOrchestrationConfig(this.env),server=getServerFootballProviderConfig(this.env);
  if(!controls.providerEnabled||!controls.providerCallsEnabled||controls.ingestionDryRun||!controls.historicalIngestionEnabled)return{status:"SKIPPED",providerRequests:0,examined:0,changed:0,summary:{reason:"HISTORICAL_INGESTION_DISABLED"}};
  const requested=new Set((this.env.FOOTBALL_HISTORICAL_COMPETITION_IDS??"").split(",").map(value=>value.trim()).filter(Boolean));
  const selected=historicalLeagueTargets.filter(target=>!requested.size||requested.has(target.id));
  if(!selected.length||requested.size!==selected.length)throw new Error("Historical ingestion rejected an unknown competition target.");
  const audits:unknown[]=[],provider=new ApiFootballProvider({apiKey:server.apiKey,enabled:server.enabled,onRequest:audit=>audits.push(audit)}),repository=new SupabaseFootballIngestionRepository(this.client),requests=new SupabaseProviderRequestRepository(this.client),results=[];
  const verifiedTargets=[];
  if(selected.length*3>controls.maxProviderRequestsPerRun)throw new Error("Historical ingestion request ceiling is insufficient for the verified cohort.");
  const today=new Date(),dayStart=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate())).toISOString(),requestsUsed=await requests.countRequests(provider.name,dayStart);
  if(requestsUsed+selected.length*3>server.dailyRequestBudget)throw new Error("Historical ingestion would exceed the internal daily request budget.");
  try{for(const target of selected){
   const requestedAt=new Date().toISOString(),candidates=await provider.discoverCompetitions({country:target.country,season:target.season});
   const matches=candidates.flatMap(candidate=>candidate.seasons.filter(season=>season.year===target.season&&season.start&&season.end).map(season=>({candidate,season}))).filter(({candidate})=>candidate.providerId===target.providerId&&candidate.name.trim()===target.providerName&&candidate.country.trim()===target.country&&candidate.type===target.type);
   if(matches.length!==1)throw new Error(`Historical mapping verification failed for ${target.id}.`);
   const verified=matches[0],saved=await this.client.from("football_competition_verifications").upsert({provider:"api-football",internal_competition_id:target.id,provider_competition_id:target.providerId,provider_name:target.providerName,country:target.country,competition_type:target.type,season:target.season,season_start:verified.season.start,season_end:verified.season.end,verified_at:requestedAt},{onConflict:"provider,internal_competition_id,season"});
   if(saved.error)throw new Error("Historical mapping verification persistence failed.");
   await requests.recordRequest({provider:"api-football",category:"competition",endpoint:`leagues-verification:${target.id}-${target.season}`,requestedAt,requestCount:1,succeeded:true,cacheState:"missing",refreshReason:"manual",errorCode:null});
   verifiedTargets.push({target,seasonStart:verified.season.start,seasonEnd:verified.season.end});
  }
  if(verifiedTargets.length!==selected.length)throw new Error("All historical mappings must verify before ingestion.");
  for(const {target,seasonStart,seasonEnd} of verifiedTargets){
   const result=await ingestHistoricalLeague({target:{...target,verifiedSeasonStart:seasonStart,verifiedSeasonEnd:seasonEnd},provider,repository,requests,dailyBudget:server.dailyRequestBudget});
   if(result.status!=="completed")throw new Error(`Historical ingestion failed for ${target.id}.`);
   results.push({competition:target.id,providerCompetitionId:target.providerId,season:target.season,seasonStart,seasonEnd,teams:result.counts.teams,fixtures:result.counts.fixtures,providerRequests:1+result.requestCount});
  }
  if(audits.length>controls.maxProviderRequestsPerRun)throw new Error("Historical ingestion exceeded its provider request ceiling.");
  return{status:"COMPLETED",providerRequests:audits.length,examined:results.length,changed:results.reduce((sum,row)=>sum+row.fixtures,0),summary:{competitions:results}};}catch(error){if(typeof error==="object"&&error)Object.assign(error,{providerRequestsConsumed:audits.length});throw error}
 }
 private async ingest():Promise<JobResult>{const controls=getFootballOrchestrationConfig(this.env),server=getServerFootballProviderConfig(this.env);if(!controls.providerEnabled||!controls.providerCallsEnabled||controls.ingestionDryRun)return{status:"SKIPPED",providerRequests:0,examined:0,changed:0,summary:{reason:"PROVIDER_OR_LIVE_INGESTION_DISABLED",providerConfigured:server.provider==="api-football",apiKeyConfigured:Boolean(server.apiKey),cronSecretConfigured:Boolean(controls.cronSecret)}};const requested=new Set((this.env.FOOTBALL_INGESTION_COMPETITION_IDS??"").split(",").map(value=>value.trim()).filter(Boolean)),selected=footballDataConfig.competitions.filter(row=>row.enabled&&row.providerVerified&&row.providerId&&row.currentSeason&&(!requested.size||requested.has(row.id))).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));if(!selected.length)throw new Error("Controlled ingestion requires an enabled provider-verified competition.");if(requested.size&&selected.length!==requested.size)throw new Error("Controlled ingestion rejected an unverified or disabled competition.");const audits:unknown[]=[],provider=new ApiFootballProvider({apiKey:server.apiKey,enabled:server.enabled,onRequest:audit=>audits.push(audit)}),repository=new SupabaseFootballIngestionRepository(this.client),requests=new SupabaseProviderRequestRepository(this.client),service=new FootballDataIngestionService(provider,repository,requests,footballDataConfig.competitions,server.dailyRequestBudget),results=[];let changed=0;for(const competition of selected){if(audits.length+2>controls.maxProviderRequestsPerRun)break;const result=await service.ingestCompetition(competition.id,"scheduled",["teams","fixtures"]);changed+=result.fixtures;results.push({competition:competition.id,season:competition.currentSeason,result:result.status,fixturesChanged:result.fixtures});}if(audits.length>controls.maxProviderRequestsPerRun)throw new Error("Controlled ingestion exceeded its provider request ceiling.");return{status:results.length&&results.every(row=>row.result==="completed")?"COMPLETED":"SKIPPED",providerRequests:audits.length,examined:results.length,changed,summary:{competitions:results}}}
 private async enrich():Promise<JobResult>{
  const controls=getFootballOrchestrationConfig(this.env),server=getServerFootballProviderConfig(this.env);
  if(!controls.enrichmentEnabled||server.provider!=="api-football"||!server.apiKey)return{status:"SKIPPED",providerRequests:0,examined:0,changed:0,summary:{reason:"FIXTURE_ENRICHMENT_DISABLED",providerConfigured:server.provider==="api-football",apiKeyConfigured:Boolean(server.apiKey)}};
  const now=new Date(),horizon=new Date(now.getTime()+controls.horizonHours*3_600_000).toISOString();
  const fixtures=await this.client.from("fixtures").select("id,provider_fixture_id,kickoff_at,status,competition_id,competitions!inner(enabled,provider_id)").eq("is_demo",false).eq("competitions.enabled",true).not("provider_fixture_id","is",null).gte("kickoff_at",now.toISOString()).lte("kickoff_at",horizon).order("kickoff_at").limit(100);
  if(fixtures.error)throw new Error("Enrichment fixture selection failed.");
  const ids=(fixtures.data??[]).map(row=>row.id),published=ids.length?await this.client.from("intelligence_reports").select("fixture_id").in("fixture_id",ids).eq("status","published").eq("consumer_publication_state","PUBLISHED"):{data:[],error:null},predicted=ids.length?await this.client.from("football_shadow_predictions").select("fixture_id").in("fixture_id",ids):{data:[],error:null};
  if(published.error||predicted.error)throw new Error("Enrichment priority selection failed.");
  const publishedIds=new Set((published.data??[]).map(row=>row.fixture_id)),predictedIds=new Set((predicted.data??[]).map(row=>row.fixture_id));
  const selected=[...(fixtures.data??[])].sort((a,b)=>Number(publishedIds.has(b.id))-Number(publishedIds.has(a.id))||Number(predictedIds.has(b.id))-Number(predictedIds.has(a.id))||a.kickoff_at.localeCompare(b.kickoff_at)).slice(0,controls.maxEnrichmentFixturesPerRun);
  const audits:unknown[]=[],provider=new ApiFootballProvider({apiKey:server.apiKey,enabled:server.enabled,onRequest:audit=>audits.push(audit)}),repository=new SupabaseFootballIngestionRepository(this.client),requests=new SupabaseProviderRequestRepository(this.client),service=new FootballDataIngestionService(provider,repository,requests,footballDataConfig.competitions,server.dailyRequestBudget),refreshed:Array<Record<string,Json>>=[];
  for(const fixture of selected){const hours=(new Date(fixture.kickoff_at).getTime()-now.getTime())/3_600_000;const categories:string[]=["h2h","form"];if(hours<=48)categories.push("injuries","odds");if(hours<=3)categories.push("lineups");for(const category of categories){const estimate=provider.estimateFixtureRequests?.([category])??1;if(audits.length+estimate>controls.maxEnrichmentRequestsPerRun)break;const before=audits.length;await service.getSnapshot(fixture.id,fixture.provider_fixture_id!,category as "h2h"|"form"|"injuries"|"odds"|"lineups","scheduled");if(audits.length>before)refreshed.push({fixtureId:fixture.id,category});}if(audits.length>=controls.maxEnrichmentRequestsPerRun)break}
  if(audits.length>controls.maxEnrichmentRequestsPerRun)throw Object.assign(new Error("Fixture enrichment exceeded its provider request ceiling."),{providerRequestsConsumed:audits.length});
  return{status:"COMPLETED",providerRequests:audits.length,examined:selected.length,changed:refreshed.length,summary:{horizonHours:controls.horizonHours,candidates:fixtures.data?.length??0,refreshed}};
 }
 private async predict():Promise<JobResult>{const config=getFootballOrchestrationConfig(this.env),controls=getShadowPipelineControls(this.env);if(!config.predictionEnabled)return{status:"SKIPPED",providerRequests:0,examined:0,changed:0,summary:{reason:"PREDICTION_PIPELINE_DISABLED"}};const allowlist=getSupportedShadowCompetitions(),now=new Date().toISOString(),sources=await loadPersistedShadowFixtureSources(this.client,allowlist,now,config.horizonHours),predictions=new SupabaseShadowPredictionRepository(this.client),runs=new SupabaseShadowRunRepository(this.client),worker=await runRollingShadowWorker({lockKey:`${config.environment}:prediction`,sources,repositories:{predictions,runs},controls:{...controls,horizonHours:config.horizonHours,maxProviderRequestsPerRun:config.maxProviderRequestsPerRun},allowlist,frozenProviderFixtureIds:new Set(),now,persist:true});if(!worker.report)return{status:"SKIPPED",providerRequests:0,examined:0,changed:0,summary:{reason:worker.status}};return{status:"COMPLETED",providerRequests:0,examined:worker.report.fixturesFound,changed:worker.report.predictionsCreated,summary:{eligible:worker.report.fixturesEligible,reused:worker.report.predictionsReused,horizonHours:config.horizonHours}}}
 private async publish():Promise<JobResult>{const config=getFootballOrchestrationConfig(this.env);if(!config.publishingEnabled)return{status:"SKIPPED",providerRequests:0,examined:0,changed:0,summary:{reason:"PUBLIC_PUBLISHING_DISABLED"}};const shadows=await this.client.from("football_shadow_predictions").select("id,kickoff_at,settlement_status,evaluation_cohort").eq("settlement_status","PENDING").eq("evaluation_cohort","TOP_20").gt("kickoff_at",new Date().toISOString()),service=new ConsumerPredictionPublicationService(this.client);if(shadows.error)throw new Error("Publication candidate read failed.");let changed=0;for(const shadow of shadows.data??[]){const existing=await this.client.from("intelligence_reports").select("id,status,consumer_publication_state").eq("forward_prediction_id",shadow.id).maybeSingle();if(existing.error)throw new Error("Publication identity read failed.");const id=existing.data?.id??await service.prepare(shadow.id,"premium"),state=existing.data?.consumer_publication_state??"NOT_PUBLISHED";if(state==="PUBLISHED")continue;if(state==="NOT_PUBLISHED")await service.markReadyForReview(id);await service.publish(id);changed++}return{status:"COMPLETED",providerRequests:0,examined:shadows.data?.length??0,changed,summary:{published:changed}}}
 private async settle():Promise<JobResult>{
  const config=getFootballOrchestrationConfig(this.env);
  if(!config.settlementEnabled)return{status:"SKIPPED",providerRequests:0,examined:0,changed:0,summary:{reason:"SETTLEMENT_DISABLED"}};
  const now=new Date(),checkedAt=now.toISOString(),repository=new SupabaseShadowPredictionRepository(this.client);
  const predictions=(await repository.list()).filter(row=>row.settlementStatus==="PENDING"&&new Date(row.kickoffAt)<=now).sort((a,b)=>a.kickoffAt.localeCompare(b.kickoffAt));
  const ids=predictions.map(row=>row.fixtureId),fixtures=ids.length?await this.client.from("fixtures").select("*,competitions(provider_id,season)").in("id",ids):{data:[],error:null};
  if(fixtures.error)throw new Error("Settlement fixture read failed.");
  const teamIds=[...new Set((fixtures.data??[]).flatMap(row=>[row.home_team_id,row.away_team_id]))],teams=teamIds.length?await this.client.from("teams").select("id,provider_id").in("id",teamIds):{data:[],error:null};
  if(teams.error)throw new Error("Settlement team identity read failed.");
  const teamProviderIds=new Map((teams.data??[]).map(row=>[row.id,row.provider_id])),server=getServerFootballProviderConfig(this.env),providerReady=config.providerEnabled&&config.providerCallsEnabled&&server.enabled&&server.provider==="api-football"&&Boolean(server.apiKey),audits:unknown[]=[];
  const provider=providerReady?new ApiFootballProvider({apiKey:server.apiKey,enabled:true,onRequest:audit=>audits.push(audit)}):null,ingestion=new SupabaseFootballIngestionRepository(this.client),requests=new SupabaseProviderRequestRepository(this.client);
  const dayStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())).toISOString(),used=provider?await requests.countRequests(provider.name,dayStart):0,requestLimit=Math.max(0,Math.min(config.maxProviderRequestsPerRun,server.dailyRequestBudget-used));
  const finalStatuses=new Set(["finished","cancelled","postponed","abandoned","void"]),refreshed:string[]=[],unresolved:Array<{fixtureId:string;reason:string}>=[];let changed=0;
  for(const prediction of predictions){
   let fixture=fixtures.data?.find(row=>row.id===prediction.fixtureId),refreshFailed=false;if(!fixture){unresolved.push({fixtureId:prediction.fixtureId,reason:"FIXTURE_NOT_FOUND"});continue}
   const competition=Array.isArray(fixture.competitions)?fixture.competitions[0]:fixture.competitions;
   if(!competition?.provider_id||!fixture.provider_fixture_id){unresolved.push({fixtureId:prediction.fixtureId,reason:"PROVIDER_IDENTITY_MISSING"});continue}
   if(provider&&audits.length<requestLimit){
    const requestedAt=new Date().toISOString(),before=audits.length;
    try{
     const fresh=await provider.fetchFixtureData(fixture.provider_fixture_id,[]),homeProviderId=teamProviderIds.get(fixture.home_team_id),awayProviderId=teamProviderIds.get(fixture.away_team_id);
     if(fresh.fixture.competitionProviderId!==competition.provider_id||fresh.fixture.homeTeamProviderId!==homeProviderId||fresh.fixture.awayTeamProviderId!==awayProviderId)throw new Error("PROVIDER_FIXTURE_IDENTITY_MISMATCH");
     await ingestion.upsertFixture(provider.name,fresh.fixture,fixture.competition_id,fixture.home_team_id,fixture.away_team_id,fresh.fetchedAt);
     await requests.recordRequest({provider:provider.name,category:"score",endpoint:`fixtures?id=${fixture.provider_fixture_id}`,requestedAt,requestCount:fresh.requestCount??Math.max(1,audits.length-before),succeeded:true,cacheState:"missing",refreshReason:"scheduled",errorCode:null});
     fixture={...fixture,kickoff_at:fresh.fixture.kickoffAt,status:fresh.fixture.status,home_score:fresh.fixture.homeScore,away_score:fresh.fixture.awayScore,last_synced_at:fresh.fetchedAt};refreshed.push(fixture.id);
    }catch(error){
     const consumed=Math.max(1,audits.length-before),code=error instanceof Error?error.name:"PROVIDER_REFRESH_ERROR";
     await requests.recordRequest({provider:provider.name,category:"score",endpoint:`fixtures?id=${fixture.provider_fixture_id}`,requestedAt,requestCount:consumed,succeeded:false,cacheState:"missing",refreshReason:"scheduled",errorCode:code});
     unresolved.push({fixtureId:fixture.id,reason:code});refreshFailed=true;
    }
   }
   if(refreshFailed)continue;
   if(!finalStatuses.has(fixture.status)){if(!unresolved.some(row=>row.fixtureId===fixture!.id))unresolved.push({fixtureId:fixture.id,reason:"FIXTURE_NOT_FINAL"});continue}
   try{const result=await settleShadowPrediction(repository,prediction,{providerFixtureId:fixture.provider_fixture_id??"",providerCompetitionId:competition.provider_id,season:competition.season,homeTeamId:fixture.home_team_id,awayTeamId:fixture.away_team_id,kickoffAt:fixture.kickoff_at,status:fixture.status,homeScore:fixture.home_score,awayScore:fixture.away_score},checkedAt);if(result.disposition==="UPDATED")changed++}catch(error){unresolved.push({fixtureId:fixture.id,reason:error instanceof Error?error.message:"SETTLEMENT_ERROR"})}
  }
  return{status:"COMPLETED",providerRequests:audits.length,examined:predictions.length,changed,summary:{settled:changed,refreshed:refreshed.length,unresolved:unresolved.slice(0,100),providerRefreshEnabled:providerReady,requestLimit}};
 }
}
