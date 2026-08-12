-- P6.3: keep checkout/payment correlation separate from Paystack subscription identity.
-- Additive and safe for the Development project; do not apply to Production in P6.3.
alter table public.consumer_subscriptions
  add column if not exists initial_payment_reference text,
  add column if not exists provider_customer_reference text;

update public.consumer_subscriptions s
set initial_payment_reference = s.provider_subscription_reference
where s.initial_payment_reference is null;

update public.consumer_subscriptions s
set provider_customer_reference = c.provider_customer_reference
from public.payment_customers c
where c.id = s.billing_customer_id
  and s.provider_customer_reference is null;

-- Legacy pending rows used the checkout transaction reference as a subscription
-- reference. Quarantine that value as payment correlation and keep entitlement off.
update public.consumer_subscriptions
set provider_subscription_reference = null,
    status = 'pending',
    entitlement_status = 'inactive',
    updated_at = now()
where provider_subscription_reference is not null
  and provider_subscription_reference !~ '^SUB_[A-Za-z0-9]+$';

alter table public.consumer_subscriptions
  alter column initial_payment_reference set not null,
  alter column provider_customer_reference set not null,
  alter column provider_subscription_reference drop not null;

create unique index if not exists consumer_subscriptions_initial_payment_reference_unique
  on public.consumer_subscriptions(provider, environment, initial_payment_reference);

alter table public.consumer_subscriptions
  drop constraint if exists consumer_subscriptions_genuine_provider_reference;
alter table public.consumer_subscriptions
  add constraint consumer_subscriptions_genuine_provider_reference
  check (provider_subscription_reference is null or provider_subscription_reference ~ '^SUB_[A-Za-z0-9]+$');

alter table public.consumer_subscriptions
  drop constraint if exists consumer_subscriptions_active_requires_provider_subscription;
alter table public.consumer_subscriptions
  add constraint consumer_subscriptions_active_requires_provider_subscription
  check (
    (status <> 'active' and entitlement_status <> 'active')
    or provider_subscription_reference is not null
  );
