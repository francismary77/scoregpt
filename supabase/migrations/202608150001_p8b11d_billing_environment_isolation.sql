begin;

alter table public.payment_transactions
  alter column environment drop default;
alter table public.managed_platform_billings
  alter column provider_environment drop default;

alter table public.orders
  add column if not exists payment_environment public.payment_environment;

update public.orders o
set payment_environment = coalesce(
  (
    select t.environment
    from public.payment_transactions t
    where t.order_id = o.id
      and t.purpose = 'business_setup'
    order by t.created_at desc
    limit 1
  ),
  'test'::public.payment_environment
)
where o.payment_environment is null;

alter table public.orders
  alter column payment_environment set not null;

drop index if exists public.orders_checkout_idempotency_key_idx;
create unique index orders_checkout_environment_idempotency_key_idx
  on public.orders(payment_environment, checkout_idempotency_key)
  where checkout_idempotency_key is not null;

alter table public.consumer_subscription_checkouts
  add column if not exists environment public.payment_environment;

update public.consumer_subscription_checkouts c
set environment = s.environment
from public.consumer_subscriptions s
where s.id = c.subscription_id
  and c.environment is null;

update public.consumer_subscription_checkouts
set environment = 'test'::public.payment_environment
where environment is null;

alter table public.consumer_subscription_checkouts
  alter column environment set not null;

alter table public.consumer_subscription_checkouts
  drop constraint if exists consumer_subscription_checkouts_idempotency_key_key,
  drop constraint if exists consumer_subscription_checkouts_provider_reference_key;

create unique index if not exists consumer_subscription_checkouts_environment_idempotency_key_idx
  on public.consumer_subscription_checkouts(environment, idempotency_key);
create unique index if not exists consumer_subscription_checkouts_environment_provider_reference_idx
  on public.consumer_subscription_checkouts(environment, provider_reference);

drop function if exists public.has_active_consumer_subscription(uuid);
create function public.has_active_consumer_subscription(
  p_user_id uuid,
  p_environment public.payment_environment
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (auth.role() = 'service_role' or p_user_id = (select auth.uid()))
    and exists (
      select 1
      from public.consumer_subscriptions s
      where s.user_id = p_user_id
        and s.environment = p_environment
        and s.status = 'active'
        and s.entitlement_status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
    )
$$;
revoke all on function public.has_active_consumer_subscription(uuid, public.payment_environment) from public, anon;
grant execute on function public.has_active_consumer_subscription(uuid, public.payment_environment) to authenticated, service_role;

drop function if exists public.confirm_business_setup_payment(uuid, uuid, text, bigint);
create function public.confirm_business_setup_payment(
  p_order_id uuid,
  p_transaction_id uuid,
  p_reference text,
  p_amount_minor bigint,
  p_environment public.payment_environment
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_tx public.payment_transactions;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if p_environment is null then raise exception 'payment_environment_required'; end if;

  select * into v_order
  from public.orders
  where id = p_order_id
    and payment_environment = p_environment
  for update;
  if not found or v_order.payment_purpose <> 'business_setup' or v_order.payment_method <> 'paystack' then
    raise exception 'invalid_order_relationship';
  end if;

  select * into v_tx
  from public.payment_transactions
  where id = p_transaction_id
    and order_id = p_order_id
    and provider = 'paystack'
    and purpose = 'business_setup'
    and environment = p_environment
    and reference = p_reference
  for update;
  if not found then raise exception 'transaction_not_found'; end if;
  if v_order.order_status = 'paid' then return v_order.id; end if;
  if v_tx.transaction_state <> 'succeeded'
    or v_tx.paid_amount_minor is distinct from p_amount_minor
    or p_amount_minor <> v_order.amount_minor
    or v_tx.currency <> v_order.currency then
    raise exception 'payment_validation_failed';
  end if;

  update public.orders
  set status = 'payment-verified', verified_at = coalesce(verified_at, now()), order_status = 'paid',
      onboarding_status = 'awaiting_client_information', paid_at = coalesce(paid_at, now()),
      fulfillment_count = fulfillment_count + 1, updated_at = now()
  where id = p_order_id and payment_environment = p_environment;
  return p_order_id;
end
$$;
revoke all on function public.confirm_business_setup_payment(uuid, uuid, text, bigint, public.payment_environment) from public, anon, authenticated;
grant execute on function public.confirm_business_setup_payment(uuid, uuid, text, bigint, public.payment_environment) to service_role;

drop function if exists public.confirm_manual_business_setup_payment(uuid, uuid, bigint, text, text);
create function public.confirm_manual_business_setup_payment(
  p_order_id uuid,
  p_admin_user_id uuid,
  p_amount_minor bigint,
  p_payment_reference text,
  p_audit_note text default null,
  p_environment public.payment_environment default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_role text;
  v_existing public.manual_payment_confirmations;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if p_environment is null then raise exception 'payment_environment_required'; end if;
  select role into v_role from public.profiles where user_id = p_admin_user_id;
  if v_role is distinct from 'admin' then raise exception 'admin_required'; end if;
  select * into v_order from public.orders
  where id = p_order_id and payment_environment = p_environment for update;
  if not found or v_order.payment_purpose <> 'business_setup' or v_order.payment_method <> 'manual-bank' then raise exception 'invalid_manual_order'; end if;
  select * into v_existing from public.manual_payment_confirmations where order_id = p_order_id;
  if found then
    if v_existing.amount_minor <> p_amount_minor or v_existing.currency <> v_order.currency or v_existing.payment_reference <> p_payment_reference then raise exception 'confirmation_conflict'; end if;
    return p_order_id;
  end if;
  if v_order.order_status <> 'pending_payment' or v_order.manual_payment_status <> 'awaiting_manual_confirmation' then raise exception 'ineligible_manual_order'; end if;
  if p_amount_minor <> v_order.amount_minor or v_order.currency <> 'NGN' then raise exception 'payment_validation_failed'; end if;
  insert into public.manual_payment_confirmations(order_id, confirmed_by, amount_minor, currency, payment_reference, audit_note)
  values(p_order_id, p_admin_user_id, p_amount_minor, 'NGN', p_payment_reference, nullif(trim(p_audit_note), ''));
  update public.orders set status = 'payment-verified', verified_at = coalesce(verified_at, now()), order_status = 'paid', onboarding_status = 'awaiting_client_information', paid_at = coalesce(paid_at, now()), manual_payment_status = 'confirmed', manual_confirmed_at = coalesce(manual_confirmed_at, now()), manual_confirmed_by = p_admin_user_id, fulfillment_count = fulfillment_count + 1, updated_at = now()
  where id = p_order_id and payment_environment = p_environment;
  return p_order_id;
end
$$;
revoke all on function public.confirm_manual_business_setup_payment(uuid, uuid, bigint, text, text, public.payment_environment) from public, anon, authenticated;
grant execute on function public.confirm_manual_business_setup_payment(uuid, uuid, bigint, text, text, public.payment_environment) to service_role;

drop function if exists public.establish_managed_platform_billing(uuid, uuid, uuid);
create function public.establish_managed_platform_billing(
  p_order_id uuid,
  p_owner_user_id uuid,
  p_record_id uuid default gen_random_uuid(),
  p_environment public.payment_environment default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_existing uuid;
  v_product text;
  v_price text;
  v_amount bigint;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if p_environment is null then raise exception 'payment_environment_required'; end if;
  select * into v_order from public.orders
  where id = p_order_id and payment_environment = p_environment for update;
  if not found or v_order.payment_purpose <> 'business_setup' or v_order.order_status <> 'paid' or v_order.paid_at is null or v_order.user_id is distinct from p_owner_user_id then raise exception 'invalid_qualifying_order'; end if;
  select id into v_existing from public.managed_platform_billings where setup_order_id = p_order_id and provider_environment = p_environment;
  if found then return v_existing; end if;
  if v_order.package_id = 'launch' then v_product := 'managed-launch-monthly'; v_price := 'managed-launch-monthly-v1'; v_amount := 1800000;
  elsif v_order.package_id = 'business' then v_product := 'managed-business-monthly'; v_price := 'managed-business-monthly-v1'; v_amount := 2400000;
  else raise exception 'invalid_package'; end if;
  insert into public.managed_platform_billings(id, setup_order_id, owner_user_id, package_id, product_key, price_snapshot_id, amount_minor, included_period_start, included_period_end, billing_status, provider_environment)
  values(p_record_id, p_order_id, p_owner_user_id, v_order.package_id, v_product, v_price, v_amount, v_order.paid_at, v_order.paid_at + interval '6 months', case when now() < v_order.paid_at + interval '6 months' then 'included_period'::public.managed_platform_billing_status else 'authorization_required'::public.managed_platform_billing_status end, p_environment)
  returning id into v_existing;
  return v_existing;
end
$$;
revoke all on function public.establish_managed_platform_billing(uuid, uuid, uuid, public.payment_environment) from public, anon, authenticated;
grant execute on function public.establish_managed_platform_billing(uuid, uuid, uuid, public.payment_environment) to service_role;

create or replace function public.create_managed_platform_billing_for_paid_order() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_purpose = 'business_setup' and new.order_status = 'paid' and new.paid_at is not null and new.user_id is not null and new.package_id in ('launch', 'business') then
    insert into public.managed_platform_billings(setup_order_id, owner_user_id, package_id, product_key, price_snapshot_id, amount_minor, included_period_start, included_period_end, billing_status, provider_environment)
    values(new.id, new.user_id, new.package_id, case new.package_id when 'launch' then 'managed-launch-monthly' else 'managed-business-monthly' end, case new.package_id when 'launch' then 'managed-launch-monthly-v1' else 'managed-business-monthly-v1' end, case new.package_id when 'launch' then 1800000 else 2400000 end, new.paid_at, new.paid_at + interval '6 months', case when now() < new.paid_at + interval '6 months' then 'included_period'::public.managed_platform_billing_status else 'authorization_required'::public.managed_platform_billing_status end, new.payment_environment)
    on conflict(setup_order_id) do nothing;
  end if;
  return new;
end
$$;

commit;
