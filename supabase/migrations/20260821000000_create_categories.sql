create type public.category_mutation_result as (
  category_id uuid,
  revision bigint
);

revoke all on type public.category_mutation_result
from public, anon, authenticated, service_role;
grant usage on type public.category_mutation_result to authenticated, service_role;

create function private.is_valid_category_field_schema(input_schema jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  field_definition jsonb;
  option_definition jsonb;
  field_key text;
  field_type text;
  option_value text;
  seen_field_keys text[] := array[]::text[];
  seen_option_values text[];
begin
  if input_schema is null
    or pg_catalog.jsonb_typeof(input_schema) <> 'array'
    or pg_catalog.jsonb_array_length(input_schema) > 20
  then
    return false;
  end if;

  for field_definition in
    select value from pg_catalog.jsonb_array_elements(input_schema)
  loop
    if pg_catalog.jsonb_typeof(field_definition) <> 'object'
      or not field_definition ?& array[
        'key',
        'label',
        'type',
        'required',
        'filterable'
      ]
      or exists (
        select 1
        from pg_catalog.jsonb_object_keys(field_definition) as field_property
        where field_property not in (
          'key',
          'label',
          'type',
          'required',
          'filterable',
          'unit',
          'options'
        )
      )
      or pg_catalog.jsonb_typeof(field_definition -> 'key') <> 'string'
      or pg_catalog.jsonb_typeof(field_definition -> 'label') <> 'string'
      or pg_catalog.jsonb_typeof(field_definition -> 'type') <> 'string'
      or pg_catalog.jsonb_typeof(field_definition -> 'required') <> 'boolean'
      or pg_catalog.jsonb_typeof(field_definition -> 'filterable') <> 'boolean'
    then
      return false;
    end if;

    field_key := field_definition ->> 'key';
    field_type := field_definition ->> 'type';

    if field_key !~ '^[a-z][a-z0-9_]{0,49}$'
      or field_key = any(seen_field_keys)
      or field_definition ->> 'label' <> pg_catalog.btrim(field_definition ->> 'label')
      or pg_catalog.char_length(field_definition ->> 'label') not between 1 and 80
      or field_type not in (
        'text',
        'number',
        'measurement',
        'boolean',
        'select',
        'multi_select'
      )
    then
      return false;
    end if;

    seen_field_keys := pg_catalog.array_append(seen_field_keys, field_key);

    if field_type = 'measurement' then
      if not field_definition ? 'unit'
        or pg_catalog.jsonb_typeof(field_definition -> 'unit') <> 'string'
        or field_definition ->> 'unit' <> pg_catalog.btrim(field_definition ->> 'unit')
        or pg_catalog.char_length(field_definition ->> 'unit') not between 1 and 24
        or field_definition ? 'options'
      then
        return false;
      end if;
    elsif field_type in ('select', 'multi_select') then
      if field_definition ? 'unit'
        or not field_definition ? 'options'
        or pg_catalog.jsonb_typeof(field_definition -> 'options') <> 'array'
        or pg_catalog.jsonb_array_length(field_definition -> 'options') not between 1 and 30
      then
        return false;
      end if;

      seen_option_values := array[]::text[];

      for option_definition in
        select value
        from pg_catalog.jsonb_array_elements(field_definition -> 'options')
      loop
        if pg_catalog.jsonb_typeof(option_definition) <> 'object'
          or not option_definition ?& array['value', 'label']
          or exists (
            select 1
            from pg_catalog.jsonb_object_keys(option_definition) as option_property
            where option_property not in ('value', 'label')
          )
          or pg_catalog.jsonb_typeof(option_definition -> 'value') <> 'string'
          or pg_catalog.jsonb_typeof(option_definition -> 'label') <> 'string'
        then
          return false;
        end if;

        option_value := option_definition ->> 'value';

        if option_value !~ '^[a-z0-9][a-z0-9_-]{0,49}$'
          or option_value = any(seen_option_values)
          or option_definition ->> 'label' <> pg_catalog.btrim(option_definition ->> 'label')
          or pg_catalog.char_length(option_definition ->> 'label') not between 1 and 80
        then
          return false;
        end if;

        seen_option_values := pg_catalog.array_append(
          seen_option_values,
          option_value
        );
      end loop;
    elsif field_definition ? 'unit' or field_definition ? 'options' then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke execute on function private.is_valid_category_field_schema(jsonb)
from public, anon, authenticated, service_role;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  current_draft_version_id uuid,
  current_published_version_id uuid,
  draft_revision bigint not null default 0,
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_nonnegative_revision check (draft_revision >= 0),
  constraint categories_archive_actor check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  ),
  constraint categories_timestamp_order check (
    updated_at >= created_at
    and (archived_at is null or archived_at >= created_at)
  )
);

create table public.category_versions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  revision bigint not null,
  parent_category_id uuid references public.categories (id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  display_order integer not null default 0,
  field_schema jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint category_versions_positive_revision check (revision > 0),
  constraint category_versions_not_own_parent check (
    parent_category_id is null or parent_category_id <> category_id
  ),
  constraint category_versions_trimmed_name check (
    name = pg_catalog.btrim(name)
    and pg_catalog.char_length(name) between 2 and 80
  ),
  constraint category_versions_normalized_slug check (
    slug = pg_catalog.lower(pg_catalog.btrim(slug))
    and pg_catalog.char_length(slug) between 2 and 80
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint category_versions_description check (
    description is null
    or (
      description = pg_catalog.btrim(description)
      and pg_catalog.char_length(description) between 1 and 1000
    )
  ),
  constraint category_versions_display_order check (
    display_order between 0 and 9999
  ),
  constraint category_versions_field_schema check (
    private.is_valid_category_field_schema(field_schema)
  ),
  constraint category_versions_seo_title check (
    seo_title is null
    or (
      seo_title = pg_catalog.btrim(seo_title)
      and pg_catalog.char_length(seo_title) between 1 and 70
    )
  ),
  constraint category_versions_seo_description check (
    seo_description is null
    or (
      seo_description = pg_catalog.btrim(seo_description)
      and pg_catalog.char_length(seo_description) between 1 and 180
    )
  ),
  constraint category_versions_revision_unique unique (category_id, revision),
  constraint category_versions_identity_unique unique (category_id, id)
);

alter table public.categories
  add constraint categories_draft_version_belongs_to_category
  foreign key (id, current_draft_version_id)
  references public.category_versions (category_id, id)
  on delete restrict
  deferrable initially immediate,
  add constraint categories_published_version_belongs_to_category
  foreign key (id, current_published_version_id)
  references public.category_versions (category_id, id)
  on delete restrict
  deferrable initially immediate,
  add constraint categories_draft_pointer_state check (
    (draft_revision = 0 and current_draft_version_id is null)
    or (draft_revision > 0 and current_draft_version_id is not null)
  );

create table public.category_slug_claims (
  slug text primary key,
  category_id uuid not null references public.categories (id) on delete restrict,
  claimed_at timestamptz not null default now(),
  constraint category_slug_claims_normalized_slug check (
    slug = pg_catalog.lower(pg_catalog.btrim(slug))
    and pg_catalog.char_length(slug) between 2 and 80
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

create index category_versions_parent_category_id_idx
on public.category_versions (parent_category_id);

create index categories_active_idx
on public.categories (archived_at, updated_at);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger category_versions_are_immutable
before update or delete on public.category_versions
for each row execute function private.prevent_immutable_row_change();

create trigger category_slug_claims_are_immutable
before update or delete on public.category_slug_claims
for each row execute function private.prevent_immutable_row_change();

create function private.claim_category_slug(
  input_slug text,
  input_category_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  claimed_category_id uuid;
begin
  insert into public.category_slug_claims (slug, category_id)
  values (input_slug, input_category_id)
  on conflict (slug) do nothing;

  select category_id
  into claimed_category_id
  from public.category_slug_claims
  where slug = input_slug;

  if claimed_category_id is distinct from input_category_id then
    raise exception using
      errcode = 'P0001',
      message = 'category_slug_conflict';
  end if;
end;
$$;

create function private.assert_category_parent(
  input_category_id uuid,
  input_parent_category_id uuid
)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  parent_parent_category_id uuid;
begin
  if input_parent_category_id is null then
    return;
  end if;

  if input_category_id is not null
    and input_parent_category_id = input_category_id
  then
    raise exception using
      errcode = 'P0001',
      message = 'category_parent_self';
  end if;

  select versions.parent_category_id
  into parent_parent_category_id
  from public.categories as parents
  join public.category_versions as versions
    on versions.id = parents.current_draft_version_id
  where parents.id = input_parent_category_id
    and parents.archived_at is null;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'category_parent_unavailable';
  end if;

  if parent_parent_category_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'category_depth_exceeded';
  end if;

  if input_category_id is not null
    and exists (
      select 1
      from public.categories as children
      join public.category_versions as child_versions
        on child_versions.id = children.current_draft_version_id
      where children.archived_at is null
        and child_versions.parent_category_id = input_category_id
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'category_has_children';
  end if;
end;
$$;

revoke execute on function private.claim_category_slug(text, uuid)
from public, anon, authenticated, service_role;
revoke execute on function private.assert_category_parent(uuid, uuid)
from public, anon, authenticated, service_role;

create function public.create_category_draft(
  input_name text,
  input_slug text,
  input_parent_category_id uuid,
  input_description text,
  input_display_order integer,
  input_field_schema jsonb,
  input_seo_title text,
  input_seo_description text,
  request_correlation_id uuid
)
returns public.category_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  new_category_id uuid := gen_random_uuid();
  new_version_id uuid := gen_random_uuid();
begin
  if actor_user_id is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'category_not_authorized';
  end if;

  perform private.assert_category_parent(null, input_parent_category_id);

  insert into public.categories (id)
  values (new_category_id);

  perform private.claim_category_slug(input_slug, new_category_id);

  insert into public.category_versions (
    id,
    category_id,
    revision,
    parent_category_id,
    name,
    slug,
    description,
    display_order,
    field_schema,
    seo_title,
    seo_description,
    created_by
  )
  values (
    new_version_id,
    new_category_id,
    1,
    input_parent_category_id,
    input_name,
    input_slug,
    input_description,
    input_display_order,
    input_field_schema,
    input_seo_title,
    input_seo_description,
    actor_user_id
  );

  update public.categories
  set
    current_draft_version_id = new_version_id,
    draft_revision = 1
  where id = new_category_id;

  insert into public.admin_audit_events (
    actor_kind,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    correlation_id,
    outcome
  )
  values (
    'admin',
    actor_user_id,
    'category.create',
    'category',
    new_category_id,
    request_correlation_id,
    'success'
  );

  return (new_category_id, 1)::public.category_mutation_result;
end;
$$;

create function public.update_category_draft(
  input_category_id uuid,
  expected_revision bigint,
  input_name text,
  input_slug text,
  input_parent_category_id uuid,
  input_description text,
  input_display_order integer,
  input_field_schema jsonb,
  input_seo_title text,
  input_seo_description text,
  request_correlation_id uuid
)
returns public.category_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  category_record public.categories%rowtype;
  next_revision bigint;
  new_version_id uuid := gen_random_uuid();
begin
  if actor_user_id is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'category_not_authorized';
  end if;

  select *
  into category_record
  from public.categories
  where id = input_category_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'category_not_found';
  end if;

  if category_record.archived_at is not null then
    raise exception using errcode = 'P0001', message = 'category_archived';
  end if;

  if category_record.draft_revision <> expected_revision then
    raise exception using errcode = 'P0001', message = 'category_stale_revision';
  end if;

  perform private.assert_category_parent(
    input_category_id,
    input_parent_category_id
  );
  perform private.claim_category_slug(input_slug, input_category_id);

  next_revision := category_record.draft_revision + 1;

  insert into public.category_versions (
    id,
    category_id,
    revision,
    parent_category_id,
    name,
    slug,
    description,
    display_order,
    field_schema,
    seo_title,
    seo_description,
    created_by
  )
  values (
    new_version_id,
    input_category_id,
    next_revision,
    input_parent_category_id,
    input_name,
    input_slug,
    input_description,
    input_display_order,
    input_field_schema,
    input_seo_title,
    input_seo_description,
    actor_user_id
  );

  update public.categories
  set
    current_draft_version_id = new_version_id,
    draft_revision = next_revision
  where id = input_category_id;

  insert into public.admin_audit_events (
    actor_kind,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    correlation_id,
    outcome
  )
  values (
    'admin',
    actor_user_id,
    'category.update',
    'category',
    input_category_id,
    request_correlation_id,
    'success'
  );

  return (input_category_id, next_revision)::public.category_mutation_result;
end;
$$;

create function public.archive_category(
  input_category_id uuid,
  expected_revision bigint,
  request_correlation_id uuid
)
returns public.category_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  category_record public.categories%rowtype;
  next_revision bigint;
begin
  if actor_user_id is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'category_not_authorized';
  end if;

  select *
  into category_record
  from public.categories
  where id = input_category_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'category_not_found';
  end if;

  if category_record.archived_at is not null then
    raise exception using errcode = 'P0001', message = 'category_already_archived';
  end if;

  if category_record.draft_revision <> expected_revision then
    raise exception using errcode = 'P0001', message = 'category_stale_revision';
  end if;

  if exists (
    select 1
    from public.categories as children
    join public.category_versions as child_versions
      on child_versions.id = children.current_draft_version_id
    where children.archived_at is null
      and child_versions.parent_category_id = input_category_id
  )
  then
    raise exception using errcode = 'P0001', message = 'category_has_children';
  end if;

  next_revision := category_record.draft_revision + 1;

  update public.categories
  set
    archived_at = pg_catalog.clock_timestamp(),
    archived_by = actor_user_id,
    draft_revision = next_revision
  where id = input_category_id;

  insert into public.admin_audit_events (
    actor_kind,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    correlation_id,
    outcome
  )
  values (
    'admin',
    actor_user_id,
    'category.archive',
    'category',
    input_category_id,
    request_correlation_id,
    'success'
  );

  return (input_category_id, next_revision)::public.category_mutation_result;
end;
$$;

create function public.restore_category(
  input_category_id uuid,
  expected_revision bigint,
  request_correlation_id uuid
)
returns public.category_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  category_record public.categories%rowtype;
  category_parent_id uuid;
  next_revision bigint;
begin
  if actor_user_id is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'category_not_authorized';
  end if;

  select *
  into category_record
  from public.categories
  where id = input_category_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'category_not_found';
  end if;

  if category_record.archived_at is null then
    raise exception using errcode = 'P0001', message = 'category_not_archived';
  end if;

  if category_record.draft_revision <> expected_revision then
    raise exception using errcode = 'P0001', message = 'category_stale_revision';
  end if;

  select parent_category_id
  into category_parent_id
  from public.category_versions
  where id = category_record.current_draft_version_id;

  perform private.assert_category_parent(input_category_id, category_parent_id);

  next_revision := category_record.draft_revision + 1;

  update public.categories
  set
    archived_at = null,
    archived_by = null,
    draft_revision = next_revision
  where id = input_category_id;

  insert into public.admin_audit_events (
    actor_kind,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    correlation_id,
    outcome
  )
  values (
    'admin',
    actor_user_id,
    'category.restore',
    'category',
    input_category_id,
    request_correlation_id,
    'success'
  );

  return (input_category_id, next_revision)::public.category_mutation_result;
end;
$$;

alter table public.categories enable row level security;
alter table public.category_versions enable row level security;
alter table public.category_slug_claims enable row level security;

revoke all on table public.categories
from public, anon, authenticated, service_role;
revoke all on table public.category_versions
from public, anon, authenticated, service_role;
revoke all on table public.category_slug_claims
from public, anon, authenticated, service_role;

grant select on table public.categories to authenticated, service_role;
grant select on table public.category_versions to authenticated, service_role;
grant select on table public.category_slug_claims to authenticated, service_role;

create policy categories_select_admin
on public.categories
for select
to authenticated
using ((select public.is_admin()));

create policy category_versions_select_admin
on public.category_versions
for select
to authenticated
using ((select public.is_admin()));

create policy category_slug_claims_select_admin
on public.category_slug_claims
for select
to authenticated
using ((select public.is_admin()));

revoke execute on function public.create_category_draft(
  text,
  text,
  uuid,
  text,
  integer,
  jsonb,
  text,
  text,
  uuid
) from public, anon, authenticated, service_role;
revoke execute on function public.update_category_draft(
  uuid,
  bigint,
  text,
  text,
  uuid,
  text,
  integer,
  jsonb,
  text,
  text,
  uuid
) from public, anon, authenticated, service_role;
revoke execute on function public.archive_category(uuid, bigint, uuid)
from public, anon, authenticated, service_role;
revoke execute on function public.restore_category(uuid, bigint, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.create_category_draft(
  text,
  text,
  uuid,
  text,
  integer,
  jsonb,
  text,
  text,
  uuid
) to authenticated;
grant execute on function public.update_category_draft(
  uuid,
  bigint,
  text,
  text,
  uuid,
  text,
  integer,
  jsonb,
  text,
  text,
  uuid
) to authenticated;
grant execute on function public.archive_category(uuid, bigint, uuid)
to authenticated;
grant execute on function public.restore_category(uuid, bigint, uuid)
to authenticated;

comment on table public.categories is
  'Stable category identities with draft and published version pointers';
comment on table public.category_versions is
  'Append-only category copy, taxonomy, SEO, ordering, and field-schema snapshots';
comment on table public.category_slug_claims is
  'Permanent ownership registry preventing a category slug from being reused by another category';
comment on function public.create_category_draft(
  text,
  text,
  uuid,
  text,
  integer,
  jsonb,
  text,
  text,
  uuid
) is 'Creates the first immutable draft version for a stable category identity';
comment on function public.update_category_draft(
  uuid,
  bigint,
  text,
  text,
  uuid,
  text,
  integer,
  jsonb,
  text,
  text,
  uuid
) is 'Appends a category draft version after checking administrator access and optimistic revision';
comment on function public.archive_category(uuid, bigint, uuid) is
  'Archives an unreferenced category without deleting its identity or version history';
comment on function public.restore_category(uuid, bigint, uuid) is
  'Restores an archived category when its taxonomy parent remains valid';
