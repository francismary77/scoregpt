begin;
alter table public.orders
  add column if not exists payment_purpose public.payment_purpose,
  add column if not exists product_key text,
  add column if not exists price_snapshot_id text,
  add column if not exists standard_amount_minor bigint,
  add column if not exists promotion_id text,
  add column if not exists business_terms_version text,
  add column if not exists refund_policy_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists order_status text not null default 'pending_payment',
  add column if not exists onboarding_status text not null default 'awaiting_payment',
  add column if not exists paid_at timestamptz,
  add column if not exists checkout_idempotency_key text,
  add column if not exists fulfillment_count integer not null default 0;
update public.orders set payment_purpose='business_setup',product_key=case package_id when'launch'then'b2b-launch-setup' when'business'then'b2b-business-setup'end,standard_amount_minor=case package_id when'launch'then 50000000 when'business'then 100000000 else amount_minor end,price_snapshot_id=coalesce(price_snapshot_id,'legacy-order'),business_terms_version=coalesce(business_terms_version,'legacy'),refund_policy_version=coalesce(refund_policy_version,'legacy'),terms_accepted_at=coalesce(terms_accepted_at,created_at),order_status=case when status in('payment-verified','completed')then'paid' when status='cancelled'then'cancelled' when status='payment-rejected'then'payment_failed'else'pending_payment'end,onboarding_status=case when status in('payment-verified','completed')then'awaiting_client_information'else'awaiting_payment'end where payment_purpose is null;
alter table public.orders add constraint orders_b2b_setup_snapshot_check check(payment_purpose is distinct from 'business_setup' or(product_key is not null and price_snapshot_id is not null and standard_amount_minor>0 and amount_minor>0 and currency='NGN' and business_terms_version is not null and refund_policy_version is not null and terms_accepted_at is not null and order_status in('pending_payment','payment_failed','paid','cancelled')and onboarding_status in('not_started','awaiting_payment','awaiting_client_information')));
create unique index orders_checkout_idempotency_key_idx on public.orders(checkout_idempotency_key)where checkout_idempotency_key is not null;
create index orders_payment_purpose_status_idx on public.orders(payment_purpose,order_status,created_at desc);
revoke insert,update,delete on public.orders,public.payment_transactions from anon,authenticated;
create or replace function public.confirm_business_setup_payment(p_order_id uuid,p_transaction_id uuid,p_reference text,p_amount_minor bigint)returns uuid language plpgsql security definer set search_path='' as $$declare v_order public.orders;v_tx public.payment_transactions;begin if auth.role()<>'service_role'then raise exception 'forbidden';end if;select*into v_order from public.orders where id=p_order_id for update;if not found or v_order.payment_purpose<>'business_setup'or v_order.payment_method<>'paystack'then raise exception 'invalid_order_relationship';end if;select*into v_tx from public.payment_transactions where id=p_transaction_id and order_id=p_order_id and provider='paystack'and environment='test'and reference=p_reference for update;if not found then raise exception 'transaction_not_found';end if;if v_order.order_status='paid'then return v_order.id;end if;if v_tx.transaction_state<>'succeeded'or v_tx.paid_amount_minor is distinct from p_amount_minor or p_amount_minor<>v_order.amount_minor or v_tx.currency<>v_order.currency then raise exception 'payment_validation_failed';end if;update public.orders set status='payment-verified',verified_at=coalesce(verified_at,now()),order_status='paid',onboarding_status='awaiting_client_information',paid_at=coalesce(paid_at,now()),fulfillment_count=fulfillment_count+1,updated_at=now()where id=p_order_id;return p_order_id;end$$;
revoke all on function public.confirm_business_setup_payment(uuid,uuid,text,bigint)from public,anon,authenticated;grant execute on function public.confirm_business_setup_payment(uuid,uuid,text,bigint)to service_role;
commit;
