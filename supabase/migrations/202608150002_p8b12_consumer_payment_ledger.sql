begin;

create or replace function public.sync_consumer_subscription_payment_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.payment_transactions (
    provider, reference, amount_minor, currency, status, metadata,
    purpose, subject_type, subject_id, environment, product_id, price_id,
    expected_amount_minor, paid_amount_minor, transaction_state, verified_at
  ) values (
    new.provider, new.initial_payment_reference, new.amount_minor, new.currency,
    case when new.status = 'active' and new.entitlement_status = 'active' then 'payment-verified' else 'pending-payment' end,
    jsonb_build_object('consumer_subscription_id', new.id),
    'consumer_subscription', 'user', new.user_id, new.environment, new.product_id, new.price_id,
    new.amount_minor,
    case when new.status = 'active' and new.entitlement_status = 'active' then new.amount_minor else null end,
    case when new.status = 'active' and new.entitlement_status = 'active' then 'succeeded'::public.payment_transaction_state else 'initialized'::public.payment_transaction_state end,
    case when new.status = 'active' and new.entitlement_status = 'active' then coalesce(new.current_period_start, new.started_at, new.updated_at) else null end
  )
  on conflict (provider, environment, reference) do update
  set status = case when excluded.transaction_state = 'succeeded' then excluded.status else public.payment_transactions.status end,
      paid_amount_minor = coalesce(excluded.paid_amount_minor, public.payment_transactions.paid_amount_minor),
      transaction_state = case when excluded.transaction_state = 'succeeded' then excluded.transaction_state else public.payment_transactions.transaction_state end,
      verified_at = coalesce(excluded.verified_at, public.payment_transactions.verified_at),
      metadata = public.payment_transactions.metadata || excluded.metadata,
      updated_at = now()
  where public.payment_transactions.purpose = 'consumer_subscription'
    and public.payment_transactions.subject_type = 'user'
    and public.payment_transactions.subject_id = new.user_id
    and public.payment_transactions.environment = new.environment;
  return new;
end
$$;

drop trigger if exists sync_consumer_subscription_payment_transaction on public.consumer_subscriptions;
create trigger sync_consumer_subscription_payment_transaction
after insert or update of status, entitlement_status, current_period_start, started_at
on public.consumer_subscriptions
for each row execute function public.sync_consumer_subscription_payment_transaction();

insert into public.payment_transactions (
  provider, reference, amount_minor, currency, status, metadata,
  purpose, subject_type, subject_id, environment, product_id, price_id,
  expected_amount_minor, paid_amount_minor, transaction_state, verified_at
)
select
  s.provider, s.initial_payment_reference, s.amount_minor, s.currency,
  case when s.status = 'active' and s.entitlement_status = 'active' then 'payment-verified' else 'pending-payment' end,
  jsonb_build_object('consumer_subscription_id', s.id),
  'consumer_subscription', 'user', s.user_id, s.environment, s.product_id, s.price_id,
  s.amount_minor,
  case when s.status = 'active' and s.entitlement_status = 'active' then s.amount_minor else null end,
  case when s.status = 'active' and s.entitlement_status = 'active' then 'succeeded'::public.payment_transaction_state else 'initialized'::public.payment_transaction_state end,
  case when s.status = 'active' and s.entitlement_status = 'active' then coalesce(s.current_period_start, s.started_at, s.updated_at) else null end
from public.consumer_subscriptions s
on conflict (provider, environment, reference) do nothing;

commit;
