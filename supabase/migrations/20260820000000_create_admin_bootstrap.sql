-- Task 5 used this exact fake binding for database tests. Remove only that
-- known local fixture so runtime can perform the real first-login binding.
delete from public.admin_accounts
where id = '30000000-0000-4000-8000-000000000001'
  and email = 'admin@ya-gameela.test'
  and auth_user_id = '10000000-0000-4000-8000-000000000001';

create function public.bind_admin_account(
  candidate_user_id uuid,
  expected_email text,
  request_correlation_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_expected_email text := pg_catalog.lower(pg_catalog.btrim(expected_email));
  candidate_email text;
  candidate_confirmed boolean;
  candidate_uses_google boolean;
  existing_account public.admin_accounts%rowtype;
begin
  if normalized_expected_email is null
    or normalized_expected_email !~ '^[^[:space:]@]+@gmail\.com$'
  then
    return 'invalid_configuration';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(80421901);

  select
    pg_catalog.lower(pg_catalog.btrim(users.email)),
    users.email_confirmed_at is not null,
    exists (
      select 1
      from auth.identities
      where identities.user_id = users.id
        and identities.provider = 'google'
    )
  into candidate_email, candidate_confirmed, candidate_uses_google
  from auth.users as users
  where users.id = candidate_user_id;

  if not found then
    insert into public.admin_audit_events (
      actor_kind,
      action,
      correlation_id,
      outcome,
      reason_code
    )
    values (
      'system',
      'auth.admin_bind',
      request_correlation_id,
      'denied',
      'auth.user_missing'
    );
    return 'denied';
  end if;

  if not candidate_confirmed then
    insert into public.admin_audit_events (
      actor_kind,
      action,
      correlation_id,
      outcome,
      reason_code
    )
    values (
      'system',
      'auth.admin_bind',
      request_correlation_id,
      'denied',
      'auth.email_unconfirmed'
    );
    return 'denied';
  end if;

  if not candidate_uses_google then
    insert into public.admin_audit_events (
      actor_kind,
      action,
      correlation_id,
      outcome,
      reason_code
    )
    values (
      'system',
      'auth.admin_bind',
      request_correlation_id,
      'denied',
      'auth.provider_denied'
    );
    return 'denied';
  end if;

  if candidate_email is distinct from normalized_expected_email then
    insert into public.admin_audit_events (
      actor_kind,
      action,
      correlation_id,
      outcome,
      reason_code
    )
    values (
      'system',
      'auth.admin_bind',
      request_correlation_id,
      'denied',
      'auth.email_denied'
    );
    return 'denied';
  end if;

  select *
  into existing_account
  from public.admin_accounts
  where singleton
  for update;

  if found then
    if existing_account.auth_user_id = candidate_user_id
      and existing_account.email = normalized_expected_email
    then
      return 'already_bound';
    end if;

    insert into public.admin_audit_events (
      actor_kind,
      action,
      correlation_id,
      outcome,
      reason_code
    )
    values (
      'system',
      'auth.admin_bind',
      request_correlation_id,
      'denied',
      'auth.binding_conflict'
    );
    return 'denied';
  end if;

  insert into public.admin_accounts (
    email,
    auth_user_id,
    bound_at
  )
  values (
    normalized_expected_email,
    candidate_user_id,
    pg_catalog.clock_timestamp()
  );

  insert into public.admin_audit_events (
    actor_kind,
    action,
    correlation_id,
    outcome
  )
  values (
    'system',
    'auth.admin_bind',
    request_correlation_id,
    'success'
  );

  return 'bound';
end;
$$;

revoke execute on function public.bind_admin_account(uuid, text, uuid)
from public, anon, authenticated;
grant execute on function public.bind_admin_account(uuid, text, uuid)
to service_role;

comment on function public.bind_admin_account(uuid, text, uuid) is
  'Atomically binds the single administrator after verifying a confirmed Google identity and exact configured email';
