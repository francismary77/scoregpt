import fs from "node:fs";
import { ApiFootballProvider } from "../modules/football-data/api-football-provider.ts";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : []; })), audits = [], provider = new ApiFootballProvider({ apiKey: env.FOOTBALL_API_KEY, enabled: true, onRequest: (audit) => audits.push(audit) }), reports = [];
for (const id of ["39", "61"]) { const competition = await provider.getCompetitionMetadata(id), season = competition.seasons.find((item) => item.year === "2026"); reports.push({ id, name: competition.name, country: competition.country, season }); }
console.log(JSON.stringify({ requests: audits.length, remaining: audits.at(-1)?.rateLimitRemaining, reports }, null, 2));
