import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
export const metadata:Metadata={title:"Responsible Use",description:"Responsible-use guidance for 9ja Football AI football predictions and analysis."};
export default function Page(){return <LegalDocument eyebrow="Responsible use" title="Use football intelligence responsibly" intro="Football predictions are uncertain. Treat 9ja Football AI as informational analysis, never as a promise of an outcome or profit.">
<h2>What we provide</h2><p>9ja Football AI provides statistics, probability-based predictions and football intelligence. Predictions can be wrong, confidence is not certainty, and past performance does not guarantee future results.</p>
<h2>What we do not provide</h2><p>9ja Football AI and FABRO TECH LIMITED are not bookmakers. We do not accept wagers, hold betting funds, place bets for users or guarantee winnings.</p>
<h2>Your responsibility</h2><p>Any decision to bet is yours alone. Follow the gambling laws and minimum-age rules that apply where you live. Never stake money needed for food, housing, education, healthcare, debt payments or other essentials, and never borrow money to bet.</p>
<h2>Keep control</h2><p>Set firm time and spending limits, avoid chasing losses and take regular breaks. Do not bet while distressed, impaired or under pressure. If betting stops being recreational or affects your finances, relationships or wellbeing, pause and seek appropriate local support.</p>
<h2>Accuracy and availability</h2><p>Team news, postponements, source data and other conditions can change. Always verify important information independently and do not interpret a model probability as bookmaker odds or guaranteed success.</p>
</LegalDocument>}
