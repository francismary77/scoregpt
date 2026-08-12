if(typeof window!=="undefined")throw new Error("Payment foundation is restricted to the server runtime.");
import type { InitializePaymentInput, PaymentEnvironment, PaymentPrice, PaymentPurpose, PaymentSubject, ProviderPaymentResult } from "./domain";

const currencies = new Set(["NGN"]);
const paymentPurposes:readonly PaymentPurpose[]=["business_setup","consumer_subscription","managed_platform","client_subscriber_split"];
const subjectByPurpose: Record<PaymentPurpose, PaymentSubject["type"]> = { business_setup:"order", consumer_subscription:"user", managed_platform:"client_platform", client_subscriber_split:"client_platform" };
export const paymentProductCatalog = [
  { key:"b2b-launch-setup", purpose:"business_setup", name:"Launch Edition setup", prices:[{version:1,kind:"standard",amountMinor:50000000,interval:"one_time"},{version:2,kind:"promotional",amountMinor:35000000,interval:"one_time"}] },
  { key:"b2b-business-setup", purpose:"business_setup", name:"Business Edition setup", prices:[{version:1,kind:"standard",amountMinor:100000000,interval:"one_time"},{version:2,kind:"promotional",amountMinor:75000000,interval:"one_time"}] },
  { key:"consumer-premium-monthly", purpose:"consumer_subscription", name:"Premium monthly", prices:[{version:1,kind:"current",amountMinor:300000,interval:"monthly"}] },
  { key:"managed-launch-monthly", purpose:"managed_platform", name:"Launch Managed Platform", prices:[{version:1,kind:"current",amountMinor:1800000,interval:"monthly"}] },
  { key:"managed-business-monthly", purpose:"managed_platform", name:"Business Managed Platform", prices:[{version:1,kind:"current",amountMinor:2400000,interval:"monthly"}] },
] as const;

export function isPaymentPurpose(value:string):value is PaymentPurpose{return paymentPurposes.includes(value as PaymentPurpose)}
export function assertCurrency(currency:string){if(!/^[A-Z]{3}$/.test(currency)||!currencies.has(currency))throw new Error("unsupported_currency")}
export function assertMinorAmount(value:number){if(!Number.isSafeInteger(value)||value<=0)throw new Error("invalid_minor_amount")}
export function assertPurposeSubject(purpose:PaymentPurpose,subject:PaymentSubject){if(subjectByPurpose[purpose]!==subject.type||!subject.id)throw new Error("invalid_payment_subject")}
export function resolveTrustedPrice(productKey:string,at=new Date()):PaymentPrice{const product=paymentProductCatalog.find(item=>item.key===productKey);if(!product)throw new Error("payment_product_not_found");const chosen=[...product.prices].sort((a,b)=>b.version-a.version)[0];return{id:`${product.key}-v${chosen.version}`,productKey:product.key,version:chosen.version,kind:chosen.kind,amountMinor:chosen.amountMinor,currency:"NGN",interval:chosen.interval,active:true,effectiveFrom:new Date(Date.UTC(at.getUTCFullYear(),0,1)).toISOString()}}
export function createAuthoritativePayment(productKey:string,input:Omit<InitializePaymentInput,"purpose"|"expectedAmountMinor"|"currency">):InitializePaymentInput{const product=paymentProductCatalog.find(item=>item.key===productKey);if(!product)throw new Error("payment_product_not_found");const price=resolveTrustedPrice(productKey);assertPurposeSubject(product.purpose,input.subject);return{...input,purpose:product.purpose,expectedAmountMinor:price.amountMinor,currency:price.currency}}
export function validateProviderResult(result:ProviderPaymentResult,expected:InitializePaymentInput){if(result.providerId!==expected.providerId||result.environment!==expected.environment||result.reference!==expected.reference||result.amountMinor!==expected.expectedAmountMinor||result.currency!==expected.currency)throw new Error("provider_result_mismatch");return result}
export function paymentFoundationEnabled(env:NodeJS.ProcessEnv=process.env){return env.PAYMENTS_ENABLED==="true"&&env.PAYMENT_PROVIDER!=="disabled"}
export function parsePaymentEnvironment(value:string|undefined):PaymentEnvironment{if(value==="test"||value==="live")return value;throw new Error("invalid_payment_environment")}
export class MockPaystackGatewayProvider{
  readonly id="paystack";readonly environment:PaymentEnvironment;private readonly records=new Map<string,ProviderPaymentResult>();
  constructor(environment:PaymentEnvironment="test"){this.environment=environment}
  async initialize(request:InitializePaymentInput){if(request.providerId!==this.id||request.environment!==this.environment)throw new Error("provider_environment_mismatch");assertMinorAmount(request.expectedAmountMinor);assertCurrency(request.currency);assertPurposeSubject(request.purpose,request.subject);if(!/^[A-Za-z0-9_-]{12,100}$/.test(request.reference))throw new Error("invalid_provider_reference");if(this.records.has(request.reference))throw new Error("duplicate_provider_reference");const result:ProviderPaymentResult={providerId:this.id,environment:this.environment,reference:request.reference,state:"initialized",amountMinor:request.expectedAmountMinor,currency:request.currency,authorizationUrl:`https://checkout.example.test/${request.reference}`};this.records.set(request.reference,result);return validateProviderResult(result,request)}
  async verify(reference:string){const result=this.records.get(reference);if(!result)throw new Error("malformed_provider_response");return{...result}}
  async mapCustomer(subjectId:string,email:string){if(!subjectId||!/^\S+@\S+\.\S+$/.test(email))throw new Error("invalid_customer_mapping");return{providerCustomerReference:`CUS_TEST_${subjectId}`}}
}
