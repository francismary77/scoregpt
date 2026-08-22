import "@/lib/server-only";
import { NextResponse } from "next/server";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";
import { authorizeFootballCron } from "./auth";
import { getFootballOrchestrationConfig } from "./config";
import { FootballProductionOrchestrator,type FootballJob } from "./service";
export function createFootballCronHandler(job:FootballJob){return async function GET(request:Request){const config=getFootballOrchestrationConfig();if(!authorizeFootballCron(request,config.cronSecret))return NextResponse.json({error:"unauthorized"},{status:401});try{const result=await new FootballProductionOrchestrator(createPrivilegedSupabaseClient()).run(job);return NextResponse.json(result,{status:result.status==="OVERLAPPING_RUN_SKIPPED"?202:200})}catch{return NextResponse.json({error:"football_job_failed",job},{status:500})}}}
export const FOOTBALL_LIFECYCLE_JOBS:readonly FootballJob[]=["settlement","enrichment","verification","ingestion","prediction","publication"];
export function createFootballLifecycleCronHandler(){return async function GET(request:Request){const config=getFootballOrchestrationConfig();if(!authorizeFootballCron(request,config.cronSecret))return NextResponse.json({error:"unauthorized"},{status:401});const orchestrator=new FootballProductionOrchestrator(createPrivilegedSupabaseClient()),jobs=[];let failed=false;for(const job of FOOTBALL_LIFECYCLE_JOBS)try{const result=await orchestrator.run(job);jobs.push({job,status:result.status})}catch{failed=true;jobs.push({job,status:"FAILED"})}return NextResponse.json({status:failed?"PARTIAL_FAILURE":"COMPLETED",jobs},{status:failed?500:200})}}
