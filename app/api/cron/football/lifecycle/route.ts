import { createFootballLifecycleCronHandler } from "@/modules/football-orchestration/route";
export const runtime="nodejs";export const dynamic="force-dynamic";export const GET=createFootballLifecycleCronHandler();
