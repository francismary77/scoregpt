import "tsx/esm";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const { footballCompetitions }=await import("../config/football-data.ts");
const { FootballExperienceService }=await import("../modules/football-experience/service.ts");

test("customer football read model exposes complete demo-safe summaries and public reports only",async()=>{const data=await new FootballExperienceService(null).getExperience();assert.equal(data.competitions.length,30);assert.ok(data.fixtures.length);assert.ok(data.results.length);assert.ok(data.reports.every(item=>item.accessLevel==="public"));assert.ok(data.fixtures.every(item=>item.provenance==="demonstration"));for(const fixture of data.fixtures){assert.ok(fixture.homeTeam.name);assert.ok(fixture.awayTeam.name);assert.ok(fixture.competition.name)}});

test("30-competition positioning preserves staged rollout reality",()=>{assert.equal(footballCompetitions.length,30);assert.equal(footballCompetitions.filter(item=>item.enabled).length,5);assert.equal(footballCompetitions.filter(item=>item.providerId===null).length,25)});

test("customer render graph cannot import provider or ingestion execution",async()=>{const paths=["app/page.tsx","app/matches/page.tsx","app/results/page.tsx","app/matches/[fixtureId]/page.tsx","app/competitions/page.tsx","app/competitions/[competitionId]/page.tsx","components/match-browser.tsx","components/result-browser.tsx","modules/football-experience/application.ts","modules/football-experience/service.ts","modules/football-experience/repository.ts"];for(const path of paths){const source=await read(path);assert.doesNotMatch(source,/ApiFootballProvider|api-football-provider|football-data\/(?:bootstrap|manual|service)|fetchCompetitionData|fetchFixtureData|x-apisports-key/)}});

test("football routes include canonical metadata, polished empty states and server access checks",async()=>{const[site,matches,results,competitions,detail,competitionDetail]=await Promise.all([read("config/site.ts"),read("app/matches/page.tsx"),read("app/results/page.tsx"),read("app/competitions/page.tsx"),read("app/matches/[fixtureId]/page.tsx"),read("app/competitions/[competitionId]/page.tsx")]);assert.match(site,/https:\/\/9jafootballai\.com\.ng/);for(const source of[matches,results,competitions,competitionDetail])assert.match(source,/getSiteUrl|createFootballExperienceService/);assert.match(detail,/accessLevel/);assert.match(detail,/predictionUsage/);assert.match(detail,/Registered and Premium reports are excluded/);assert.match(competitionDetail,/No upcoming fixtures available/);assert.match(competitionDetail,/No recent results available/)});

test("customer-facing source retains approved brand and commercial pricing",async()=>{const[app,components,pricing]=await Promise.all([read("app/page.tsx"),read("components/competition-grid.tsx"),read("config/pricing.ts")]);assert.doesNotMatch(`${app}\n${components}`,/ScoreGPT|scoregpt\.com\.ng/i);assert.match(app,/9ja Football AI/);assert.match(app,/30 Top Football Leagues/);assert.match(app,/rolling out competition by competition/);assert.doesNotMatch(app,/all 30 (?:are )?live/i);for(const value of["standardPrice: 500000","founderPrice: 350000","managedPlatformMonthly: 18000","standardPrice: 1000000","founderPrice: 750000","managedPlatformMonthly: 24000","includedMonths: 6"])assert.ok(pricing.includes(value),`Missing approved commercial value: ${value}`)});
