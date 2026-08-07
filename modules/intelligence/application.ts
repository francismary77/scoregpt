import { MockCompetitionRepository, MockFixtureRepository, MockPredictionRepository, MockResultsRepository } from "./mock-repositories";
import { forms, statistics } from "./mock-data";
import { CompetitionService, FixtureService, IntelligenceService, PredictionService, ResultsService } from "./services";

const fixtureRepository = new MockFixtureRepository();
const predictionRepository = new MockPredictionRepository();
const competitionRepository = new MockCompetitionRepository();
const resultsRepository = new MockResultsRepository();
export const fixtureService = new FixtureService(fixtureRepository);
export const predictionService = new PredictionService(predictionRepository);
export const competitionService = new CompetitionService(competitionRepository);
export const resultsService = new ResultsService(resultsRepository);
export const intelligenceService = new IntelligenceService(fixtureService,predictionService,competitionService,forms,statistics);

export function getMatchCentreData(competitionId?:string){return fixtureService.getDemoFixtures(competitionId).map(fixture=>({fixture,prediction:predictionService.getPrediction(fixture.id),competition:competitionService.getCompetition(fixture.competitionId),homeForm:forms.find(item=>item.teamId===fixture.homeTeam.id)??{teamId:fixture.homeTeam.id,sequence:[],summary:"Form unavailable"},awayForm:forms.find(item=>item.teamId===fixture.awayTeam.id)??{teamId:fixture.awayTeam.id,sequence:[],summary:"Form unavailable"}}))}
export function getResultsCentreData(){return resultsService.getPublicResults().map(result=>({result,prediction:predictionService.getPrediction(result.fixtureId),competition:competitionService.getCompetition(result.competitionId)}))}
export function getHomepageFootballData(){const featured=intelligenceService.getFeaturedIntelligence();const matches=getMatchCentreData().slice(0,3);const ticker=getMatchCentreData().slice(0,4).map(({fixture,competition})=>({competition:competition.name,fixture:`${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,kickoff:fixture.displayKickoff.replace(" WAT","")}));const results=resultsService.getPublicResults().slice(0,3);return{featured,matches,ticker,results}}
