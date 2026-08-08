import "tsx/esm";
import assert from "node:assert/strict";
import test from "node:test";
const { calculateTeamHistoricalFeatures, getHeadToHeadHistory, getParticipatingTeams } = await import("../modules/football-data/historical.ts");
const teams=[{id:"a",providerId:"1",name:"Alpha"},{id:"b",providerId:"2",name:"Beta"},{id:"c",providerId:"3",name:"Cup Only"}], fixture=(id,date,home,away,hs,as)=>({id,providerFixtureId:id,kickoffAt:date,status:"finished",homeTeamId:home,awayTeamId:away,homeScore:hs,awayScore:as}),dataset={teams,fixtures:[fixture("1","2024-08-01T12:00:00Z","a","b",2,1),fixture("2","2024-08-08T12:00:00Z","b","a",0,0),fixture("3","2024-08-15T12:00:00Z","a","b",1,3)]};
test("historical features derive results, goals, splits, points and recent form locally",()=>{const alpha=calculateTeamHistoricalFeatures(dataset,"a",2);assert.deepEqual({played:alpha.played,wins:alpha.wins,draws:alpha.draws,losses:alpha.losses,goalsFor:alpha.goalsFor,goalsAgainst:alpha.goalsAgainst,points:alpha.points,recentForm:alpha.recentForm},{played:3,wins:1,draws:1,losses:1,goalsFor:3,goalsAgainst:4,points:4,recentForm:["L","D"]});assert.deepEqual([alpha.home.played,alpha.home.wins,alpha.home.losses,alpha.away.played,alpha.away.draws],[2,1,1,1,1])});
test("head-to-head lookup is newest-first and limited",()=>{assert.deepEqual(getHeadToHeadHistory(dataset,"a","b",2).map(item=>item.id),["3","2"])});
test("participating-team derivation excludes unrelated Stage A teams",()=>{assert.deepEqual(getParticipatingTeams(dataset).map(item=>item.id),["a","b"])});
