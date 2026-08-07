import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ResultsCentre } from "@/components/results-centre";
import { competitionService, resultsService } from "@/modules/intelligence/application";

export const metadata: Metadata = { title: "Public Demo Results", description: "Review won, lost, void and pending demonstration prediction records with transparent status filtering." };
export default function ResultsPage(){return <><SiteHeader/><main className="results-centre-page"><section className="inner-hero intelligence-inner-hero"><div className="orb orb-two"/><div className="container"><span className="eyebrow">Transparent performance · Demo mode</span><h1>Public Results Centre</h1><p>Won, lost, void and pending demonstration records remain visible. Live prediction results are not connected yet.</p><div className="demo-banner"><i/> Demonstration record <span>Illustrative outcomes only</span></div></div></section><section className="section"><div className="container"><ResultsCentre results={resultsService.getPublicResults()} competitions={competitionService.getSupported()}/></div></section></main><SiteFooter/></>}
