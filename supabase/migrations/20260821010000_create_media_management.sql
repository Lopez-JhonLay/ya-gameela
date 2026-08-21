create type public.media_asset_status as enum (
  'pending',
  'ready',
  'rejected',
  'deleting'
);

create type public.media_upload_result as (
  media_id uuid,
  object_path text
);

create type public.media_mutation_result as (
  media_id uuid,
  status public.media_asset_status
);

revoke all on type public.media_asset_status
from public, anon, authenticated, service_role;
revoke all on type public.media_upload_result
from public, anon, authenticated, service_role;
revoke all on type public.media_mutation_result
from public, anon, authenticated, service_role;

grant usage on type public.media_asset_status to authenticated, service_role;
grant usage on type public.media_upload_result to authenticated, service_role;
grant usage on type public.media_mutation_result to authenticated, service_role;

create table public.media_assets (
  id uuid primary key,
  object_path text not null unique,
  original_extension text not null,
  status public.media_asset_status not null default 'pending',
  mime_type text,
  width integer,
  height integer,
  byte_size bigint,
  checksum_sha256 text,
  alt_text text not null,
  source_attribution text,
  failure_code text,
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint media_assets_object_path check (
    object_path = 'originals/' || id::text || '.' || original_extension
  ),
  constraint media_assets_extension check (
    original_extension in ('jpg', 'png', 'webp', 'avif')
  ),
  constraint media_assets_alt_text check (
    alt_text = pg_catalog.btrim(alt_text)
    and pg_catalog.char_length(alt_text) between 1 and 300
  ),
  constraint media_assets_source_attribution check (
    source_attribution is null
    or (
      source_attribution = pg_catalog.btrim(source_attribution)
      and pg_catalog.char_length(source_attribution) between 1 and 500
    )
  ),
  constraint media_assets_failure_code check (
    failure_code is null or failure_code ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  constraint media_assets_verified_metadata check (
    (
      status in ('pending', 'rejected')
      and mime_type is null
      and width is null
      and height is null
      and byte_size is null
      and checksum_sha256 is null
      and verified_at is null
    )
    or (
      status in ('ready', 'deleting')
      and mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
      and width between 1 and 12000
      and height between 1 and 12000
      and width::bigint * height::bigint <= 64000000
      and byte_size between 1 and 10485760
      and checksum_sha256 ~ '^[0-9a-f]{64}$'
      and verified_at is not null
    )
  ),
  constraint media_assets_failure_state check (
    (status = 'rejected' and failure_code is not null)
    or (status <> 'rejected' and failure_code is null)
  ),
  constraint media_assets_timestamp_order check (
    updated_at >= created_at
    and (verified_at is null or verified_at >= created_at)
  )
);

create table public.media_asset_references (
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  reference_type text not null,
  reference_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (media_asset_id, reference_type, reference_id),
  constraint media_asset_references_type check (
    reference_type in (
      'product_version',
      'homepage_version',
      'legal_page_version',
      'site_setting'
    )
  )
);

create index media_assets_status_updated_idx
on public.media_assets (status, updated_at);

create index media_asset_references_subject_idx
on public.media_asset_references (reference_type, reference_id);

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function private.set_updated_at();

alter table public.media_assets enable row level security;
alter table public.media_asset_references enable row level security;

revoke all on table public.media_assets
from public, anon, authenticated, service_role;
revoke all on table public.media_asset_references
from public, anon, authenticated, service_role;

grant select on table public.media_assets to authenticated, service_role;
grant select on table public.media_asset_references to authenticated, service_role;
grant insert, update, delete on table public.media_assets to service_role;
grant insert, delete on table public.media_asset_references to service_role;

create policy media_assets_select_admin
on public.media_assets
for select
to authenticated
using ((select public.is_admin()));

create policy media_asset_references_select_admin
on public.media_asset_references
for select
to authenticated
using ((select public.is_admin()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'media',
  'media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
);

create policy media_objects_select_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and (select public.is_admin())
);

create policy media_objects_insert_admin_pending
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (select public.is_admin())
  and (storage.foldername(name))[1] = 'originals'
  and storage.extension(name) in ('jpg', 'png', 'webp', 'avif')
  and exists (
    select 1
    from public.media_assets as asset
    where asset.object_path = name
      and asset.status = 'pending'
      and asset.created_by = (select auth.uid())
  )
);

create policy media_objects_update_admin_pending
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (select public.is_admin())
  and exists (
    select 1
    from public.media_assets as asset
    where asset.object_path = name
      and asset.status = 'pending'
      and asset.created_by = (select auth.uid())
  )
)
with check (
  bucket_id = 'media'
  and (select public.is_admin())
  and (storage.foldername(name))[1] = 'originals'
  and storage.extension(name) in ('jpg', 'png', 'webp', 'avif')
  and exists (
    select 1
    from public.media_assets as asset
    where asset.object_path = name
      and asset.status = 'pending'
      and asset.created_by = (select auth.uid())
  )
);

create policy media_objects_delete_admin_approved
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (select public.is_admin())
  and exists (
    select 1
    from public.media_assets as asset
    where asset.object_path = name
      and asset.status = 'deleting'
      and not exists (
        select 1
        from public.media_asset_references as asset_reference
        where asset_reference.media_asset_id = asset.id
      )
  )
);

create function private.normalized_media_extension(input_extension text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case pg_catalog.lower(pg_catalog.btrim(input_extension))
    when 'jpeg' then 'jpg'
    when 'jpg' then 'jpg'
    when 'png' then 'png'
    when 'webp' then 'webp'
    when 'avif' then 'avif'
    else null
  end;
$$;

revoke execute on function private.normalized_media_extension(text)
from public, anon, authenticated, service_role;

create function public.begin_media_upload(
  input_extension text,
  input_declared_mime_type text,
  input_byte_size bigint,
  input_alt_text text,
  input_source_attribution text,
  request_correlation_id uuid
)
returns public.media_upload_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  normalized_extension text := private.normalized_media_extension(input_extension);
  normalized_alt_text text := nullif(pg_catalog.btrim(input_alt_text), '');
  normalized_source text := nullif(pg_catalog.btrim(input_source_attribution), '');
  expected_mime_type text;
  new_media_id uuid := gen_random_uuid();
  new_object_path text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'media_not_authorized';
  end if;

  if request_correlation_id is null then
    raise exception using errcode = '22023', message = 'media_correlation_required';
  end if;

  expected_mime_type := case normalized_extension
    when 'jpg' then 'image/jpeg'
    when 'png' then 'image/png'
    when 'webp' then 'image/webp'
    when 'avif' then 'image/avif'
    else null
  end;

  if expected_mime_type is null
    or pg_catalog.lower(pg_catalog.btrim(input_declared_mime_type)) <> expected_mime_type
  then
    raise exception using errcode = '22023', message = 'media_type_invalid';
  end if;

  if input_byte_size is null or input_byte_size not between 1 and 10485760 then
    raise exception using errcode = '22023', message = 'media_size_invalid';
  end if;

  if normalized_alt_text is null
    or pg_catalog.char_length(normalized_alt_text) > 300
  then
    raise exception using errcode = '22023', message = 'media_alt_text_invalid';
  end if;

  if normalized_source is not null
    and pg_catalog.char_length(normalized_source) > 500
  then
    raise exception using errcode = '22023', message = 'media_source_invalid';
  end if;

  new_object_path := 'originals/' || new_media_id::text || '.' || normalized_extension;

  insert into public.media_assets (
    id,
    object_path,
    original_extension,
    alt_text,
    source_attribution,
    created_by,
    updated_by
  )
  values (
    new_media_id,
    new_object_path,
    normalized_extension,
    normalized_alt_text,
    normalized_source,
    actor_user_id,
    actor_user_id
  );

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
    'media.upload_begin',
    'media_asset',
    new_media_id,
    request_correlation_id,
    'success'
  );

  return (new_media_id, new_object_path)::public.media_upload_result;
end;
$$;

create function public.finalize_media_upload(
  input_media_id uuid,
  input_mime_type text,
  input_width integer,
  input_height integer,
  input_byte_size bigint,
  input_checksum_sha256 text,
  request_correlation_id uuid
)
returns public.media_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  target_asset public.media_assets%rowtype;
  expected_mime_type text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'media_not_authorized';
  end if;

  select *
  into target_asset
  from public.media_assets
  where id = input_media_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'media_not_found';
  end if;

  if target_asset.status <> 'pending' then
    raise exception using errcode = '55000', message = 'media_not_pending';
  end if;

  if not exists (
    select 1
    from storage.objects as stored_object
    where stored_object.bucket_id = 'media'
      and stored_object.name = target_asset.object_path
  ) then
    raise exception using errcode = 'P0002', message = 'media_object_missing';
  end if;

  expected_mime_type := case target_asset.original_extension
    when 'jpg' then 'image/jpeg'
    when 'png' then 'image/png'
    when 'webp' then 'image/webp'
    when 'avif' then 'image/avif'
  end;

  if input_mime_type <> expected_mime_type
    or input_width is null
    or input_height is null
    or input_width not between 1 and 12000
    or input_height not between 1 and 12000
    or input_width::bigint * input_height::bigint > 64000000
    or input_byte_size is null
    or input_byte_size not between 1 and 10485760
    or input_checksum_sha256 is null
    or input_checksum_sha256 !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'media_metadata_invalid';
  end if;

  update public.media_assets
  set
    status = 'ready',
    mime_type = input_mime_type,
    width = input_width,
    height = input_height,
    byte_size = input_byte_size,
    checksum_sha256 = input_checksum_sha256,
    failure_code = null,
    verified_at = pg_catalog.clock_timestamp(),
    updated_by = actor_user_id
  where id = input_media_id;

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
    'media.upload_finalize',
    'media_asset',
    input_media_id,
    request_correlation_id,
    'success'
  );

  return (input_media_id, 'ready')::public.media_mutation_result;
end;
$$;

create function public.reject_media_upload(
  input_media_id uuid,
  input_failure_code text,
  request_correlation_id uuid
)
returns public.media_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  normalized_failure_code text := pg_catalog.lower(pg_catalog.btrim(input_failure_code));
  target_status public.media_asset_status;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'media_not_authorized';
  end if;

  if normalized_failure_code !~ '^[a-z][a-z0-9_]{1,79}$' then
    raise exception using errcode = '22023', message = 'media_failure_code_invalid';
  end if;

  select status
  into target_status
  from public.media_assets
  where id = input_media_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'media_not_found';
  end if;

  if target_status <> 'pending' then
    raise exception using errcode = '55000', message = 'media_not_pending';
  end if;

  update public.media_assets
  set
    status = 'rejected',
    failure_code = normalized_failure_code,
    updated_by = actor_user_id
  where id = input_media_id;

  insert into public.admin_audit_events (
    actor_kind,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    correlation_id,
    outcome,
    reason_code
  )
  values (
    'admin',
    actor_user_id,
    'media.upload_reject',
    'media_asset',
    input_media_id,
    request_correlation_id,
    'failure',
    normalized_failure_code
  );

  return (input_media_id, 'rejected')::public.media_mutation_result;
end;
$$;

create function public.update_media_metadata(
  input_media_id uuid,
  input_alt_text text,
  input_source_attribution text,
  request_correlation_id uuid
)
returns public.media_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  normalized_alt_text text := nullif(pg_catalog.btrim(input_alt_text), '');
  normalized_source text := nullif(pg_catalog.btrim(input_source_attribution), '');
  target_status public.media_asset_status;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'media_not_authorized';
  end if;

  if normalized_alt_text is null
    or pg_catalog.char_length(normalized_alt_text) > 300
  then
    raise exception using errcode = '22023', message = 'media_alt_text_invalid';
  end if;

  if normalized_source is not null
    and pg_catalog.char_length(normalized_source) > 500
  then
    raise exception using errcode = '22023', message = 'media_source_invalid';
  end if;

  select status
  into target_status
  from public.media_assets
  where id = input_media_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'media_not_found';
  end if;

  if target_status <> 'ready' then
    raise exception using errcode = '55000', message = 'media_not_ready';
  end if;

  update public.media_assets
  set
    alt_text = normalized_alt_text,
    source_attribution = normalized_source,
    updated_by = actor_user_id
  where id = input_media_id;

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
    'media.metadata_update',
    'media_asset',
    input_media_id,
    request_correlation_id,
    'success'
  );

  return (input_media_id, 'ready')::public.media_mutation_result;
end;
$$;

create function public.request_media_deletion(
  input_media_id uuid,
  request_correlation_id uuid
)
returns public.media_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  target_status public.media_asset_status;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'media_not_authorized';
  end if;

  select status
  into target_status
  from public.media_assets
  where id = input_media_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'media_not_found';
  end if;

  if target_status = 'deleting' then
    return (input_media_id, 'deleting')::public.media_mutation_result;
  end if;

  if exists (
    select 1
    from public.media_asset_references as asset_reference
    where asset_reference.media_asset_id = input_media_id
  ) then
    raise exception using errcode = '23503', message = 'media_still_referenced';
  end if;

  update public.media_assets
  set
    status = 'deleting',
    failure_code = null,
    updated_by = actor_user_id
  where id = input_media_id;

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
    'media.delete_request',
    'media_asset',
    input_media_id,
    request_correlation_id,
    'success'
  );

  return (input_media_id, 'deleting')::public.media_mutation_result;
end;
$$;

create function public.complete_media_deletion(
  input_media_id uuid,
  request_correlation_id uuid
)
returns public.media_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  target_status public.media_asset_status;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'media_not_authorized';
  end if;

  select status
  into target_status
  from public.media_assets
  where id = input_media_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'media_not_found';
  end if;

  if target_status <> 'deleting' then
    raise exception using errcode = '55000', message = 'media_deletion_not_requested';
  end if;

  if exists (
    select 1
    from public.media_asset_references as asset_reference
    where asset_reference.media_asset_id = input_media_id
  ) then
    raise exception using errcode = '23503', message = 'media_still_referenced';
  end if;

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
    'media.delete_complete',
    'media_asset',
    input_media_id,
    request_correlation_id,
    'success'
  );

  delete from public.media_assets where id = input_media_id;

  return (input_media_id, 'deleting')::public.media_mutation_result;
end;
$$;

create view public.media_asset_health
with (security_invoker = true)
as
select
  asset.id as media_asset_id,
  asset.object_path,
  case
    when asset.status = 'ready' and stored_object.id is null
      then 'ready_object_missing'
    when asset.status = 'pending'
      and stored_object.id is null
      and asset.created_at < pg_catalog.now() - interval '1 hour'
      then 'pending_without_object'
    when asset.status = 'pending'
      and stored_object.id is not null
      and asset.updated_at < pg_catalog.now() - interval '15 minutes'
      then 'upload_not_finalized'
    when asset.status = 'rejected' and stored_object.id is not null
      then 'rejected_object_present'
    when asset.status = 'deleting' and stored_object.id is not null
      then 'deletion_incomplete'
    when asset.status = 'deleting' and stored_object.id is null
      then 'deletion_ready_to_complete'
    else null
  end as issue_code,
  asset.updated_at as detected_from
from public.media_assets as asset
left join storage.objects as stored_object
  on stored_object.bucket_id = 'media'
  and stored_object.name = asset.object_path
union all
select
  null::uuid as media_asset_id,
  stored_object.name as object_path,
  'object_without_metadata'::text as issue_code,
  stored_object.created_at as detected_from
from storage.objects as stored_object
left join public.media_assets as asset
  on asset.object_path = stored_object.name
where stored_object.bucket_id = 'media'
  and asset.id is null;

revoke all on table public.media_asset_health
from public, anon, authenticated, service_role;
grant select on table public.media_asset_health to authenticated, service_role;

revoke execute on function public.begin_media_upload(
  text, text, bigint, text, text, uuid
) from public, anon, authenticated, service_role;
revoke execute on function public.finalize_media_upload(
  uuid, text, integer, integer, bigint, text, uuid
) from public, anon, authenticated, service_role;
revoke execute on function public.reject_media_upload(uuid, text, uuid)
from public, anon, authenticated, service_role;
revoke execute on function public.update_media_metadata(uuid, text, text, uuid)
from public, anon, authenticated, service_role;
revoke execute on function public.request_media_deletion(uuid, uuid)
from public, anon, authenticated, service_role;
revoke execute on function public.complete_media_deletion(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.begin_media_upload(
  text, text, bigint, text, text, uuid
) to authenticated;
grant execute on function public.finalize_media_upload(
  uuid, text, integer, integer, bigint, text, uuid
) to authenticated;
grant execute on function public.reject_media_upload(uuid, text, uuid)
to authenticated;
grant execute on function public.update_media_metadata(uuid, text, text, uuid)
to authenticated;
grant execute on function public.request_media_deletion(uuid, uuid)
to authenticated;
grant execute on function public.complete_media_deletion(uuid, uuid)
to authenticated;

comment on table public.media_assets is
  'Validated source images available to CMS-managed content';
comment on table public.media_asset_references is
  'Cross-module deletion locks for draft and published media usage';
comment on view public.media_asset_health is
  'Admin-only report of missing, incomplete, rejected, or untracked media objects';
