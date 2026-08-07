import { confidenceScore, type Competition, type Fixture, type MatchStatistics, type Prediction, type ResultRecord, type Team, type TeamForm } from "./domain";

const source = { sourceType: "mock", isDemo: true, sourceLabel: "ScoreGPT demonstration dataset" } as const;
const team = (id: string, name: string, shortName: string, country: string): Team => ({ id, name, shortName, country });

export const competitions: Competition[] = [
  ["premier-league","Premier League","EPL","England"], ["champions-league","UEFA Champions League","UCL","Europe"], ["la-liga","La Liga","LAL","Spain"], ["serie-a","Serie A","SEA","Italy"], ["bundesliga","Bundesliga","BUN","Germany"],
].map(([id,name,shortName,country]) => ({ id,name,shortName,country,season:"2026 Demo",source }));

const teams = {
  arsenal: team("arsenal","Arsenal","ARS","England"), chelsea: team("chelsea","Chelsea","CHE","England"),
  barcelona: team("barcelona","Barcelona","BAR","Spain"), bayern: team("bayern","Bayern Munich","BAY","Germany"),
  villarreal: team("villarreal","Villarreal","VIL","Spain"), betis: team("betis","Real Betis","BET","Spain"),
  inter: team("inter","Inter","INT","Italy"), atalanta: team("atalanta","Atalanta","ATA","Italy"),
  dortmund: team("dortmund","Dortmund","BVB","Germany"), leipzig: team("leipzig","RB Leipzig","RBL","Germany"),
  liverpool: team("liverpool","Liverpool","LIV","England"), fulham: team("fulham","Fulham","FUL","England"),
  napoli: team("napoli","Napoli","NAP","Italy"), roma: team("roma","Roma","ROM","Italy"),
  lyon: team("lyon","Lyon","LYO","France"), lille: team("lille","Lille","LIL","France"),
};

export const fixtures: Fixture[] = [
  { id:"ars-che-demo",competitionId:"premier-league",homeTeam:teams.arsenal,awayTeam:teams.chelsea,kickoff:"2026-08-08T15:30:00Z",displayKickoff:"16:30 WAT",status:"scheduled",score:{home:null,away:null},venue:"North London Arena",source },
  { id:"int-ata-demo",competitionId:"serie-a",homeTeam:teams.inter,awayTeam:teams.atalanta,kickoff:"2026-08-08T18:45:00Z",displayKickoff:"19:45 WAT",status:"scheduled",score:{home:null,away:null},source },
  { id:"vil-bet-demo",competitionId:"la-liga",homeTeam:teams.villarreal,awayTeam:teams.betis,kickoff:"2026-08-08T19:00:00Z",displayKickoff:"20:00 WAT",status:"scheduled",score:{home:null,away:null},source },
  { id:"bar-bay-demo",competitionId:"champions-league",homeTeam:teams.barcelona,awayTeam:teams.bayern,kickoff:"2026-08-08T20:00:00Z",displayKickoff:"21:00 WAT",status:"scheduled",score:{home:null,away:null},source },
  { id:"bvb-rbl-demo",competitionId:"bundesliga",homeTeam:teams.dortmund,awayTeam:teams.leipzig,kickoff:"2026-08-09T16:30:00Z",displayKickoff:"17:30 WAT",status:"scheduled",score:{home:null,away:null},source },
  { id:"liv-ful-demo",competitionId:"premier-league",homeTeam:teams.liverpool,awayTeam:teams.fulham,kickoff:"2026-08-02T14:00:00Z",displayKickoff:"Finished",status:"finished",score:{home:3,away:1},source },
  { id:"nap-rom-demo",competitionId:"serie-a",homeTeam:teams.napoli,awayTeam:teams.roma,kickoff:"2026-08-02T18:45:00Z",displayKickoff:"Finished",status:"finished",score:{home:1,away:1},source },
  { id:"lyo-lil-demo",competitionId:"champions-league",homeTeam:teams.lyon,awayTeam:teams.lille,kickoff:"2026-08-03T19:00:00Z",displayKickoff:"Postponed",status:"postponed",score:{home:null,away:null},source },
];

const reasoning = (summary: string, bullets: string[], supportingFactors: string[]) => ({ summary, bullets, supportingFactors });
export const predictions: Prediction[] = [
  { id:"pred-ars-che",fixtureId:"ars-che-demo",market:{id:"double-home",label:"Home win or draw",outcome:"double-chance"},confidence:confidenceScore(78),risk:"medium",status:"pending",reasoning:reasoning("The home side carries the stronger balanced profile, but transition risk remains.",["Stronger recent home form","More consistent defensive shape","Away threat prevents a low-risk rating"],["Home form","Defensive consistency","Transition exposure"]),generatedAt:"2026-08-07T08:00:00Z",source },
  { id:"pred-int-ata",fixtureId:"int-ata-demo",market:{id:"over-15",label:"Over 1.5 goals",outcome:"over"},confidence:confidenceScore(84),risk:"low",status:"pending",reasoning:reasoning("Both attacking profiles support at least two total goals.",["Strong chance creation","Reliable home scoring","Open recent meetings"],["Goals trend","Shot volume","Head-to-head"]),generatedAt:"2026-08-07T08:00:00Z",source },
  { id:"pred-vil-bet",fixtureId:"vil-bet-demo",market:{id:"btts",label:"Both teams to score",outcome:"both-teams-score"},confidence:confidenceScore(72),risk:"medium",status:"pending",reasoning:reasoning("Both sides show enough attacking output to threaten, with defensive volatility on each side.",["Both sides scoring regularly","Defensive clean sheets remain inconsistent"],["Scoring form","Defensive form"]),generatedAt:"2026-08-07T08:00:00Z",source },
  { id:"pred-bar-bay",fixtureId:"bar-bay-demo",market:{id:"over-25",label:"Over 2.5 goals",outcome:"over"},confidence:confidenceScore(66),risk:"high",status:"pending",reasoning:reasoning("Elite attacking quality raises the ceiling, while the matchup remains volatile.",["High attacking quality","Knockout-style uncertainty","Limited defensive margin"],["Attack quality","Match volatility"]),generatedAt:"2026-08-07T08:00:00Z",source },
  { id:"pred-bvb-rbl",fixtureId:"bvb-rbl-demo",market:{id:"btts-2",label:"Both teams to score",outcome:"both-teams-score"},confidence:confidenceScore(76),risk:"medium",status:"pending",reasoning:reasoning("The matchup projects sustained attacking phases for both teams.",["Positive attacking form","High-tempo matchup"],["Form","Tempo"]),generatedAt:"2026-08-07T08:00:00Z",source },
  { id:"pred-liv-ful",fixtureId:"liv-ful-demo",market:{id:"over-15-r",label:"Over 1.5 goals",outcome:"over"},confidence:confidenceScore(82),risk:"low",status:"won",reasoning:reasoning("Demonstration completed prediction.",[],[]),generatedAt:"2026-08-02T08:00:00Z",source },
  { id:"pred-nap-rom",fixtureId:"nap-rom-demo",market:{id:"home-r",label:"Home win",outcome:"home"},confidence:confidenceScore(70),risk:"medium",status:"lost",reasoning:reasoning("Demonstration completed prediction.",[],[]),generatedAt:"2026-08-02T08:00:00Z",source },
  { id:"pred-lyo-lil",fixtureId:"lyo-lil-demo",market:{id:"over-25-r",label:"Over 2.5 goals",outcome:"over"},confidence:confidenceScore(68),risk:"medium",status:"void",reasoning:reasoning("The fixture was postponed.",[],[]),generatedAt:"2026-08-03T08:00:00Z",source },
];

export const forms: TeamForm[] = Object.values(teams).map((item,index)=>({teamId:item.id,sequence:index%2?["W","D","W","L","W"]:["W","W","D","W","L"],summary:index%2?"Three wins in five demo matches":"Strong recent demo form"}));
export const statistics: Record<string, MatchStatistics> = Object.fromEntries(fixtures.map((fixture,index)=>[fixture.id,{headToHeadSummary:index%2?"Balanced recent demonstration meetings, with neither side consistently controlling the matchup.":"The home side holds a narrow edge across the recent demonstration meetings.",possessionHome:52,possessionAway:48,shotsHome:13,shotsAway:10,home:{goalsScored:9+index,goalsConceded:4,wins:3,draws:1,losses:1,cleanSheets:2},away:{goalsScored:7+index,goalsConceded:6,wins:2,draws:2,losses:1,cleanSheets:1}}]));
export const results: ResultRecord[] = [
  {id:"result-1",predictionId:"pred-liv-ful",fixtureId:"liv-ful-demo",competitionId:"premier-league",fixtureLabel:"Liverpool vs Fulham",marketLabel:"Over 1.5 goals",scoreLabel:"3–1",outcome:"won",publishedAt:"2026-08-02T17:00:00Z",source},
  {id:"result-2",predictionId:"pred-nap-rom",fixtureId:"nap-rom-demo",competitionId:"serie-a",fixtureLabel:"Napoli vs Roma",marketLabel:"Home win",scoreLabel:"1–1",outcome:"lost",publishedAt:"2026-08-02T21:00:00Z",source},
  {id:"result-3",predictionId:"pred-lyo-lil",fixtureId:"lyo-lil-demo",competitionId:"champions-league",fixtureLabel:"Lyon vs Lille",marketLabel:"Over 2.5 goals",scoreLabel:"Postponed",outcome:"void",publishedAt:"2026-08-03T19:00:00Z",source},
  {id:"result-4",predictionId:"pred-ars-che",fixtureId:"ars-che-demo",competitionId:"premier-league",fixtureLabel:"Arsenal vs Chelsea",marketLabel:"Home win or draw",scoreLabel:"Pending",outcome:"pending",publishedAt:"2026-08-07T08:00:00Z",source},
];
