begin;
update public.fixtures set provider_fixture_id = 'ars-che-demo' where id = '30000000-0000-4000-8000-000000000001';
update public.fixtures set provider_fixture_id = 'int-ata-demo' where id = '30000000-0000-4000-8000-000000000002';
create unique index if not exists prediction_usage_unique_fixture_view on public.prediction_usage (user_id, fixture_id, usage_type) where fixture_id is not null;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
commit;
