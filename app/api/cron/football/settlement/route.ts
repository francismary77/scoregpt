import { createFootballCronHandler } from "@/modules/football-orchestration/route";
export const runtime="nodejs";export const dynamic="force-dynamic";export const GET=createFootballCronHandler("settlement");
