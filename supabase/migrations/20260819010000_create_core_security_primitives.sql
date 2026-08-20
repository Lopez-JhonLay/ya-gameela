create schema if not exists private;

revoke all on schema private from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage on types from public, anon, authenticated, service_role;

create type public.audit_actor_kind as enum ('admin', 'system');
create type public.audit_outcome as enum ('success', 'denied', 'failure');
create type public.release_status as enum (
  'draft',
  'validating',
  'ready',
  'publishing',
  'published',
  'failed'
);
create type public.job_status as enum (
  'running',
  'succeeded',
  'failed',
  'skipped'
);

revoke all on type public.audit_actor_kind from public, anon, authenticated, service_role;
revoke all on type public.audit_outcome from public, anon, authenticated, service_role;
revoke all on type public.release_status from public, anon, authenticated, service_role;
revoke all on type public.job_status from public, anon, authenticated, service_role;

grant usage on type public.audit_actor_kind to authenticated, service_role;
grant usage on type public.audit_outcome to authenticated, service_role;
grant usage on type public.release_status to authenticated, service_role;
grant usage on type public.job_status to authenticated, service_role;

create function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

create function private.prevent_immutable_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'immutable history rows cannot be updated or deleted';
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated, service_role;
revoke execute on function private.prevent_immutable_row_change() from public, anon, authenticated, service_role;

comment on schema private is
  'Internal database helpers that are not exposed through the Supabase Data API';
comment on function private.set_updated_at() is
  'Sets an updated_at column using the database clock';
comment on function private.prevent_immutable_row_change() is
  'Rejects updates and deletes against append-only history tables';

create table public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true,
  email text not null,
  auth_user_id uuid unique references auth.users (id) on delete restrict,
  bound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_accounts_singleton_true check (singleton),
  constraint admin_accounts_one_row unique (singleton),
  constraint admin_accounts_normalized_email check (
    email = pg_catalog.lower(pg_catalog.btrim(email))
    and pg_catalog.char_length(email) between 3 and 320
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint admin_accounts_binding_complete check (
    (auth_user_id is null and bound_at is null)
    or (auth_user_id is not null and bound_at is not null)
  ),
  constraint admin_accounts_timestamp_order check (updated_at >= created_at)
);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_accounts
      where auth_user_id = (select auth.uid())
    );
$$;

revoke execute on function public.is_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_admin() to authenticated;

comment on function public.is_admin() is
  'Returns true only when the authenticated Supabase user is bound to the single admin account';

create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_kind public.audit_actor_kind not null,
  actor_user_id uuid references auth.users (id) on delete restrict,
  action text not null,
  subject_type text,
  subject_id uuid,
  correlation_id uuid not null default gen_random_uuid(),
  outcome public.audit_outcome not null,
  reason_code text,
  occurred_at timestamptz not null default now(),
  constraint admin_audit_events_actor check (
    (actor_kind = 'admin' and actor_user_id is not null)
    or (actor_kind = 'system' and actor_user_id is null)
  ),
  constraint admin_audit_events_action_code check (
    action ~ '^[a-z][a-z0-9_.]{1,79}$'
  ),
  constraint admin_audit_events_subject_complete check (
    (subject_type is null and subject_id is null)
    or (
      subject_type ~ '^[a-z][a-z0-9_.]{1,79}$'
      and subject_id is not null
    )
  ),
  constraint admin_audit_events_reason_code check (
    reason_code is null or reason_code ~ '^[a-z][a-z0-9_.]{1,79}$'
  )
);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.release_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  rollback_of_release_id uuid references public.releases (id) on delete restrict,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint releases_trimmed_name check (
    name = pg_catalog.btrim(name)
    and pg_catalog.char_length(name) between 1 and 120
  ),
  constraint releases_not_own_rollback check (
    rollback_of_release_id is null or rollback_of_release_id <> id
  ),
  constraint releases_failure_code check (
    (
      status = 'failed'
      and failure_code ~ '^[a-z][a-z0-9_.]{1,79}$'
    )
    or (status <> 'failed' and failure_code is null)
  ),
  constraint releases_published_at check (
    (status = 'published' and published_at is not null)
    or (status <> 'published' and published_at is null)
  ),
  constraint releases_timestamp_order check (
    updated_at >= created_at
    and (published_at is null or published_at >= created_at)
  )
);

create table public.release_publications (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases (id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  previous_version_id uuid,
  published_version_id uuid,
  recorded_at timestamptz not null default now(),
  constraint release_publications_entity_type check (
    entity_type ~ '^[a-z][a-z0-9_.]{1,79}$'
  ),
  constraint release_publications_version_change check (
    (previous_version_id is not null or published_version_id is not null)
    and previous_version_id is distinct from published_version_id
  ),
  constraint release_publications_entity_once unique (
    release_id,
    entity_type,
    entity_id
  )
);

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status public.job_status not null default 'running',
  correlation_id uuid not null default gen_random_uuid(),
  attempt integer not null default 1,
  claimed_count integer not null default 0,
  succeeded_count integer not null default 0,
  failed_count integer not null default 0,
  outcome_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint job_runs_name_code check (
    job_name ~ '^[a-z][a-z0-9_.]{1,79}$'
  ),
  constraint job_runs_positive_attempt check (attempt > 0),
  constraint job_runs_nonnegative_counts check (
    claimed_count >= 0
    and succeeded_count >= 0
    and failed_count >= 0
    and succeeded_count + failed_count <= claimed_count
  ),
  constraint job_runs_outcome_code check (
    outcome_code is null or outcome_code ~ '^[a-z][a-z0-9_.]{1,79}$'
  ),
  constraint job_runs_finished_state check (
    (status = 'running' and finished_at is null)
    or (status <> 'running' and finished_at is not null)
  ),
  constraint job_runs_timestamp_order check (
    updated_at >= started_at
    and (finished_at is null or finished_at >= started_at)
  )
);

create trigger admin_accounts_set_updated_at
before update on public.admin_accounts
for each row execute function private.set_updated_at();

create trigger releases_set_updated_at
before update on public.releases
for each row execute function private.set_updated_at();

create trigger job_runs_set_updated_at
before update on public.job_runs
for each row execute function private.set_updated_at();

create trigger admin_audit_events_are_immutable
before update or delete on public.admin_audit_events
for each row execute function private.prevent_immutable_row_change();

create trigger release_publications_are_immutable
before update or delete on public.release_publications
for each row execute function private.prevent_immutable_row_change();

alter table public.admin_accounts enable row level security;
alter table public.admin_audit_events enable row level security;
alter table public.releases enable row level security;
alter table public.release_publications enable row level security;
alter table public.job_runs enable row level security;

revoke all on table public.admin_accounts from public, anon, authenticated, service_role;
revoke all on table public.admin_audit_events from public, anon, authenticated, service_role;
revoke all on table public.releases from public, anon, authenticated, service_role;
revoke all on table public.release_publications from public, anon, authenticated, service_role;
revoke all on table public.job_runs from public, anon, authenticated, service_role;

grant select on table public.admin_accounts to authenticated;
grant select on table public.admin_audit_events to authenticated;
grant select, insert, update on table public.releases to authenticated;
grant select on table public.release_publications to authenticated;
grant select on table public.job_runs to authenticated;

grant select, insert, update on table public.admin_accounts to service_role;
grant select, insert on table public.admin_audit_events to service_role;
grant select on table public.releases to service_role;
grant select on table public.release_publications to service_role;
grant select, insert, update on table public.job_runs to service_role;

create policy admin_accounts_select_admin
on public.admin_accounts
for select
to authenticated
using ((select public.is_admin()));

create policy admin_audit_events_select_admin
on public.admin_audit_events
for select
to authenticated
using ((select public.is_admin()));

create policy releases_select_admin
on public.releases
for select
to authenticated
using ((select public.is_admin()));

create policy releases_insert_admin_draft
on public.releases
for insert
to authenticated
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
  and status = 'draft'
  and published_at is null
  and failure_code is null
);

create policy releases_update_admin_draft
on public.releases
for update
to authenticated
using (
  (select public.is_admin())
  and status in ('draft', 'failed')
)
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
  and status = 'draft'
  and published_at is null
  and failure_code is null
);

create policy release_publications_select_admin
on public.release_publications
for select
to authenticated
using ((select public.is_admin()));

create policy job_runs_select_admin
on public.job_runs
for select
to authenticated
using ((select public.is_admin()));

comment on table public.admin_accounts is
  'Single protected administrator identity and its stable Supabase Auth binding';
comment on table public.admin_audit_events is
  'Append-only critical audit events containing codes and opaque identifiers but no inquiry PII';
comment on table public.releases is
  'Release batches and their controlled publishing lifecycle';
comment on table public.release_publications is
  'Immutable entity pointer changes recorded by published releases';
comment on table public.job_runs is
  'Sanitized execution history and counts for scheduled or background work';
