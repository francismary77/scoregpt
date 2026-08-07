import type { MatchPreview, MatchResult } from "@/lib/types";

export const metrics = [
  { value: "48", label: "Matches analysed today" },
  { value: "12", label: "Competitions covered" },
  { value: "24/7", label: "Analyses updated" },
  { value: "100%", label: "Results kept public" },
];

export const matches: MatchPreview[] = [
  { id: "ars-che", competition: "Premier League", home: "Arsenal", away: "Chelsea", kickoff: "16:30 WAT", insight: "Home win or draw", confidence: 78, risk: "Medium" },
  { id: "int-ata", competition: "Serie A", home: "Inter", away: "Atalanta", kickoff: "19:45 WAT", insight: "Over 1.5 goals", confidence: 84, risk: "Low" },
  { id: "vil-bet", competition: "La Liga", home: "Villarreal", away: "Real Betis", kickoff: "20:00 WAT", insight: "Both teams to score", confidence: 72, risk: "Medium" },
];

export const results: MatchResult[] = [
  { fixture: "Liverpool vs Fulham", market: "Over 1.5 goals", score: "3–1", state: "Won" },
  { fixture: "Napoli vs Roma", market: "Home win", score: "1–1", state: "Lost" },
  { fixture: "Lyon vs Lille", market: "Over 2.5 goals", score: "Postponed", state: "Void" },
];
