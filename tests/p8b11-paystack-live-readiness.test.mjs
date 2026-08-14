import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { assertPaystackNetworkSafety, createConfiguredPaystackProvider } from "../modules/billing/paystack-provider.ts";
import { normalizePaystackWebhook, verifyPaystackWebhookSignature } from "../modules/billing/paystack-webhooks.ts";
import { normalizeB2BPaystackWebhook } from "../modules/billing/b2b-webhooks.ts";

const base = { PAYMENTS_ENABLED:"true", PAYMENT_PROVIDER:"paystack", PAYSTACK_API_BASE_URL:"https://api.paystack.co", PAYSTACK_CONSUMER_MONTHLY_PLAN_CODE:"PLN_LIVEFIXTURE123" };
const testEnv = { ...base, PAYSTACK_ENVIRONMENT:"test", PAYSTACK_SECRET_KEY:"sk_test_fixture_not_real_123", NEXT_PUBLIC_SITE_URL:"https://preview.example.test" };
const liveEnv = { ...base, PAYSTACK_ENVIRONMENT:"live", PAYSTACK_SECRET_KEY:"sk_live_fixture_not_real_123", NEXT_PUBLIC_SITE_URL:"https://9jafootballai.com.ng" };

test("strict Paystack environment gate accepts matching TEST and LIVE credentials",()=>{
  assert.equal(assertPaystackNetworkSafety(testEnv).environment,"test");
  assert.equal(assertPaystackNetworkSafety(liveEnv).environment,"live");
  for(const env of [{...testEnv,PAYSTACK_SECRET_KEY:liveEnv.PAYSTACK_SECRET_KEY},{...liveEnv,PAYSTACK_SECRET_KEY:testEnv.PAYSTACK_SECRET_KEY},{...liveEnv,PAYMENTS_ENABLED:"false"}]) assert.throws(()=>assertPaystackNetworkSafety(env));
});

test("LIVE provider requires the canonical production callback host",()=>{
  assert.equal(createConfiguredPaystackProvider(liveEnv,async()=>new Response()).environment,"live");
  for(const site of ["http://9jafootballai.com.ng","https://www.9jafootballai.com.ng","https://preview.example.test"]) assert.throws(()=>createConfiguredPaystackProvider({...liveEnv,NEXT_PUBLIC_SITE_URL:site},async()=>new Response()),/production_site_required/);
  assert.throws(()=>createConfiguredPaystackProvider({...testEnv,NEXT_PUBLIC_SITE_URL:"https://9jafootballai.com.ng"},async()=>new Response()),/production_site_forbidden/);
});

test("LIVE consumer initialization sends only the trusted monthly plan, amount, and canonical callback",async()=>{
  let sent;
  const provider=createConfiguredPaystackProvider(liveEnv,async(_url,init)=>{
    sent=JSON.parse(String(init?.body));
    return new Response(JSON.stringify({status:true,data:{authorization_url:"https://checkout.paystack.com/live-fixture",reference:"TXN_live_fixture_123"}}),{status:200,headers:{"Content-Type":"application/json"}});
  });
  await provider.initializeSubscription({userId:"user-live-fixture",email:"buyer@example.test",reference:"TXN_live_fixture_123",amountMinor:300000,currency:"NGN",billingInterval:"monthly",productKey:"consumer-premium-monthly",providerPlanReference:"PLN_LIVEFIXTURE123",providerCustomerReference:"CUS_live123"});
  assert.deepEqual({plan:sent.plan,amount:sent.amount,currency:sent.currency,callback:sent.callback_url},{plan:"PLN_LIVEFIXTURE123",amount:300000,currency:"NGN",callback:"https://9jafootballai.com.ng/payments/paystack/callback"});
});

test("webhook signatures require credentials matching the configured environment",()=>{
  const raw="{\"event\":\"fixture\"}",liveSignature=createHmac("sha512",liveEnv.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  assert.equal(verifyPaystackWebhookSignature(raw,liveSignature,liveEnv.PAYSTACK_SECRET_KEY,"live"),true);
  assert.throws(()=>verifyPaystackWebhookSignature(raw,liveSignature,testEnv.PAYSTACK_SECRET_KEY,"live"),/environment_mismatch/);
});

test("consumer and B2B LIVE webhooks normalize only matching live-domain payloads",()=>{
  const consumer=JSON.stringify({id:"evt-live",event:"subscription.create",data:{domain:"live",subscription_code:"SUB_live123",status:"active",amount:300000,currency:"NGN",createdAt:"2026-08-14T12:00:00Z",customer:{customer_code:"CUS_live123"},plan:{plan_code:"PLN_LIVEFIXTURE123"},metadata:{product_key:"consumer-premium-monthly"}}});
  assert.equal(normalizePaystackWebhook(consumer,"live").environment,"live");
  assert.throws(()=>normalizePaystackWebhook(consumer,"test"),/wrong_provider_environment/);
  const business=JSON.stringify({id:"evt-b2b",event:"charge.success",data:{domain:"live",reference:"B2B_live_reference_123",amount:35000000,currency:"NGN",paid_at:"2026-08-14T12:00:00Z",customer:{email:"buyer@example.test"},metadata:{order_id:"order-1",product_key:"b2b-launch-setup",price_id:"b2b-launch-v2"}}});
  assert.equal(normalizeB2BPaystackWebhook(business,"live")?.environment,"live");
  assert.throws(()=>normalizeB2BPaystackWebhook(business,"test"),/wrong_provider_environment/);
});
