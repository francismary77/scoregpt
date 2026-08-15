import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionHeading } from "@/components/section-heading";
import { ConsumerSubscriptionCta } from "@/components/consumer-subscription-cta";
import { brand } from "@/config/brand";
import { consumerPlans, formatNaira } from "@/config/pricing";
import { entitlementConfig } from "@/config/application";
import { getSiteUrl } from "@/config/site";
import { getServerUser } from "@/modules/account/server";
import { resolveConsumerMembership } from "@/modules/account/membership-resolver";
import { createFootballExperienceService } from "@/modules/football-experience/application";
import { createServerPersistenceRepositories } from "@/modules/persistence/server";
import { unlockMemberPrediction } from "./actions";

export const metadata: Metadata = { title: "Member Access", description: `Access published ${brand.siteName} football predictions.`, alternates: { canonical: `${getSiteUrl()}/pricing` }, openGraph: { title: `Member Access | ${brand.siteName}`, description: "Access published football predictions with Free or Premium membership.", url: `${getSiteUrl()}/pricing`, images: ["/og.png"] } };

function PublicPlans() {
  return <><section className="inner-hero"><div className="orb orb-two"/><div className="container"><span className="eyebrow">Consumer membership</span><h1>Start free. Unlock deeper football intelligence.</h1><p>Create an account to choose three published predictions, or subscribe for full Premium access.</p></div></section><section className="section"><div className="container"><div className="consumer-plan-grid">{consumerPlans.map((plan,index)=><article key={plan.id} className={index===1?"consumer-plan premium-consumer-plan":"consumer-plan"}><div><span>{plan.name}</span></div><h2>{plan.priceMonthly===0?"Free":<>{formatNaira(plan.priceMonthly)}<small>/month</small></>}</h2><p>{plan.description}</p><ul>{plan.features.map(feature=><li key={feature}>✓ {feature}</li>)}</ul>{index===1?<ConsumerSubscriptionCta/>:<Link className="button button-ghost" href={plan.href}>{plan.cta} <span>→</span></Link>}</article>)}</div><p className="pricing-disclaimer">Premium is a recurring ₦3,000 monthly subscription processed securely by Paystack. Manual bank transfer is not available for consumer membership.</p></div></section></>;
}

export default async function PricingPage() {
  const user = await getServerUser();
  if (!user) return <><SiteHeader/><main className="pricing-page"><PublicPlans/></main><SiteFooter/></>;
  const membership = await resolveConsumerMembership(user.id);
  const repositories = await createServerPersistenceRepositories();
  const usage = await repositories.predictionUsage.getUsageForUser(user.id);
  const remaining = membership.hasPremiumAccess ? null : Math.max(0, entitlementConfig.freePredictionAllowance - usage.used);
  const data = await (await createFootballExperienceService()).getExperience();
  return <><SiteHeader/><main className="pricing-page"><section className="inner-hero"><div className="orb orb-two"/><div className="container"><span className="eyebrow">Member Access</span><h1>Available Predictions</h1><p>{membership.hasPremiumAccess?"Your Premium membership includes full access to every currently published prediction.":`Choose the predictions you want to unlock. Free predictions remaining: ${remaining}.`}</p></div></section><section className="section"><div className="container"><div className="member-access-heading"><div><span>{membership.hasPremiumAccess?"Premium member":"Free member"}</span><h2>Published predictions</h2></div>{membership.hasPremiumAccess?<Link className="button button-ghost" href="/account#billing">Manage subscription</Link>:<div><b>{remaining}</b><small>Free predictions remaining</small></div>}</div>{data.reports.length?<div className="member-prediction-grid">{data.reports.map(report=>{const unlocked=membership.hasPremiumAccess||usage.viewedFixtureIds.includes(report.fixture.id);const unlock=unlockMemberPrediction.bind(null,report.fixture.id);return <article key={report.id} className={unlocked?"unlocked":"locked"}><span>{report.fixture.competition.name}</span><h3>{report.fixture.homeTeam.name} vs {report.fixture.awayTeam.name}</h3><time dateTime={report.fixture.kickoffAt}>{report.fixture.displayKickoff}</time>{unlocked?<><p>{membership.hasPremiumAccess?"Premium prediction available.":"You previously unlocked this prediction."}</p><Link scroll className="button button-ghost" href={`/matches/${report.fixture.id}`}>View Prediction</Link></>:remaining&&remaining>0?<><p>Prediction details are protected until you choose to unlock them.</p><form action={unlock}><button className="button">Unlock Prediction</button></form></>:<><p>Your three Free prediction unlocks have been used. Previously unlocked predictions remain available.</p><Link className="button" href="#premium-membership">Upgrade to Premium</Link></>}</article>})}</div>:<p className="empty-inline">No published predictions are currently available.</p>}{!membership.hasPremiumAccess&&<section className="member-upgrade" id="premium-membership"><SectionHeading eyebrow="Premium membership" title="Unlock every published prediction" copy="Upgrade for full access while your subscription remains active."/><ConsumerSubscriptionCta/></section>}</div></section></main><SiteFooter/></>;
}
