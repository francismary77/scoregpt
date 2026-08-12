import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { getSiteUrl } from "@/config/site";
export const metadata:Metadata={title:"Refund and Cancellation Policy",description:"Refund and cancellation treatment for FABRO TECH LIMITED platform-development and managed services.",alternates:{canonical:`${getSiteUrl()}/refund-policy`}};
export default function Page(){return <LegalDocument eyebrow="Commercial policy" title="Refund and Cancellation Policy" intro="Custom software work is delivered through service milestones. Refund decisions therefore reflect work completed and costs already incurred.">
<h2>Before work begins</h2><p>If a client cancels before implementation starts, a refund may be available after deducting agreed administrative work and non-recoverable third-party costs already incurred for the project.</p>
<h2>After implementation starts</h2><p>Once discovery, design, configuration, development or deployment work begins, setup payments become partly or fully non-refundable in proportion to completed work, committed resources and incurred costs. We will provide a reasonable explanation of the amount retained.</p>
<h2>Completed work</h2><p>Completed or substantially delivered custom development is non-refundable except where required by applicable law or where an agreed material defect cannot be remedied within a reasonable opportunity.</p>
<h2>Duplicate or erroneous payments</h2><p>Verified duplicate payments or payments made in error will be corrected or refunded through an appropriate method after reasonable identity and transaction checks.</p>
<h2>Third-party charges</h2><p>Domain registration, API, hosting, payment-provider and other external service charges may be non-refundable where the third party has already charged or committed the service.</p>
<h2>Managed service cancellation</h2><p>A client may cancel future Managed Platform service according to the Business Terms. Cancellation is prospective and does not normally refund a service period already supplied. Managed hosting and associated services may cease after the paid period ends.</p>
<h2>Consumer subscriptions</h2><p>If paid consumer subscriptions are activated, the checkout terms and applicable law will govern cancellation and refunds. No public page should be interpreted as offering a paid subscription that has not yet been activated.</p>
<h2>Requesting a review</h2><p>Contact FABRO TECH LIMITED through official WhatsApp with the client name, package and payment reference. We will review the project stage, delivered work and recoverable costs before confirming the outcome.</p>
</LegalDocument>}
