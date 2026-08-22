create type public.product_availability as enum (
  'available',
  'low_stock',
  'coming_soon',
  'unavailable'
);

create type public.product_mutation_result as (
  product_id uuid,
  revision bigint
);

revoke all on type public.product_availability
from public, anon, authenticated, service_role;
revoke all on type public.product_mutation_result
from public, anon, authenticated, service_role;

grant usage on type public.product_availability to authenticated, service_role;
grant usage on type public.product_mutation_result to authenticated, service_role;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  current_draft_version_id uuid,
  current_published_version_id uuid,
  draft_revision bigint not null default 0,
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_nonnegative_revision check (draft_revision >= 0),
  constraint products_archive_actor check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  ),
  constraint products_timestamp_order check (
    updated_at >= created_at
    and (archived_at is null or archived_at >= created_at)
  )
);

create table public.product_slug_claims (
  slug text primary key,
  product_id uuid not null references public.products (id) on delete restrict,
  claimed_at timestamptz not null default now(),
  constraint product_slug_claims_normalized check (
    slug = pg_catalog.lower(pg_catalog.btrim(slug))
    and pg_catalog.char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

create table public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  revision bigint not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  slug text not null,
  short_description text not null,
  description text not null,
  tags text[] not null default '{}'::text[],
  specifications jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  is_new boolean not null default false,
  seo_title text,
  seo_description text,
  seo_social_media_asset_id uuid references public.media_assets (id) on delete restrict,
  base_currency text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint product_versions_positive_revision check (revision > 0),
  constraint product_versions_name check (
    name = pg_catalog.btrim(name)
    and pg_catalog.char_length(name) between 2 and 120
  ),
  constraint product_versions_slug check (
    slug = pg_catalog.lower(pg_catalog.btrim(slug))
    and pg_catalog.char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint product_versions_short_description check (
    short_description = pg_catalog.btrim(short_description)
    and pg_catalog.char_length(short_description) between 1 and 300
  ),
  constraint product_versions_description check (
    description = pg_catalog.btrim(description)
    and pg_catalog.char_length(description) between 1 and 5000
  ),
  constraint product_versions_tags check (
    pg_catalog.cardinality(tags) <= 20
  ),
  constraint product_versions_specifications_object check (
    pg_catalog.jsonb_typeof(specifications) = 'object'
  ),
  constraint product_versions_seo_title check (
    seo_title is null
    or (
      seo_title = pg_catalog.btrim(seo_title)
      and pg_catalog.char_length(seo_title) between 1 and 70
    )
  ),
  constraint product_versions_seo_description check (
    seo_description is null
    or (
      seo_description = pg_catalog.btrim(seo_description)
      and pg_catalog.char_length(seo_description) between 1 and 180
    )
  ),
  constraint product_versions_base_currency check (
    base_currency in ('AED', 'USD', 'PHP')
  ),
  constraint product_versions_revision_unique unique (product_id, revision),
  constraint product_versions_identity_unique unique (product_id, id)
);

alter table public.products
  add constraint products_draft_version_belongs_to_product
  foreign key (id, current_draft_version_id)
  references public.product_versions (product_id, id)
  on delete restrict;

alter table public.products
  add constraint products_published_version_belongs_to_product
  foreign key (id, current_published_version_id)
  references public.product_versions (product_id, id)
  on delete restrict;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint product_variants_product_identity_unique unique (product_id, id)
);

create table public.product_sku_claims (
  normalized_sku text primary key,
  product_variant_id uuid not null references public.product_variants (id) on delete restrict,
  claimed_at timestamptz not null default now(),
  constraint product_sku_claims_normalized check (
    normalized_sku = pg_catalog.lower(pg_catalog.btrim(normalized_sku))
    and pg_catalog.char_length(normalized_sku) between 1 and 64
  )
);

create table public.product_variant_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  product_version_id uuid not null,
  product_variant_id uuid not null,
  sku text,
  option_signature text not null,
  price_minor bigint not null,
  currency text not null,
  availability public.product_availability not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint product_variant_versions_product_version_fk
    foreign key (product_id, product_version_id)
    references public.product_versions (product_id, id)
    on delete restrict,
  constraint product_variant_versions_product_variant_fk
    foreign key (product_id, product_variant_id)
    references public.product_variants (product_id, id)
    on delete restrict,
  constraint product_variant_versions_sku check (
    sku is null
    or (
      sku = pg_catalog.btrim(sku)
      and pg_catalog.char_length(sku) between 1 and 64
      and sku ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$'
    )
  ),
  constraint product_variant_versions_signature check (
    pg_catalog.char_length(option_signature) <= 1000
  ),
  constraint product_variant_versions_price check (
    price_minor between 1 and 9999999999
  ),
  constraint product_variant_versions_currency check (
    currency in ('AED', 'USD', 'PHP')
  ),
  constraint product_variant_versions_variant_once unique (
    product_version_id,
    product_variant_id
  ),
  constraint product_variant_versions_combination_once unique (
    product_version_id,
    option_signature
  ),
  constraint product_variant_versions_identity_unique unique (
    product_version_id,
    id
  )
);

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references public.product_versions (id) on delete restrict,
  group_key text not null,
  name text not null,
  display_order smallint not null,
  constraint product_option_groups_key check (
    group_key = pg_catalog.lower(pg_catalog.btrim(group_key))
    and pg_catalog.char_length(group_key) between 1 and 40
    and group_key ~ '^[a-z][a-z0-9_]{0,39}$'
  ),
  constraint product_option_groups_name check (
    name = pg_catalog.btrim(name)
    and pg_catalog.char_length(name) between 1 and 50
  ),
  constraint product_option_groups_order check (display_order between 0 and 2),
  constraint product_option_groups_key_unique unique (product_version_id, group_key),
  constraint product_option_groups_order_unique unique (product_version_id, display_order),
  constraint product_option_groups_identity_unique unique (product_version_id, id)
);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null,
  option_group_id uuid not null,
  value_key text not null,
  label text not null,
  display_order smallint not null,
  constraint product_option_values_group_fk
    foreign key (product_version_id, option_group_id)
    references public.product_option_groups (product_version_id, id)
    on delete restrict,
  constraint product_option_values_key check (
    value_key = pg_catalog.lower(pg_catalog.btrim(value_key))
    and pg_catalog.char_length(value_key) between 1 and 50
    and value_key ~ '^[a-z0-9][a-z0-9_-]{0,49}$'
  ),
  constraint product_option_values_label check (
    label = pg_catalog.btrim(label)
    and pg_catalog.char_length(label) between 1 and 80
  ),
  constraint product_option_values_order check (display_order between 0 and 19),
  constraint product_option_values_key_unique unique (option_group_id, value_key),
  constraint product_option_values_order_unique unique (option_group_id, display_order),
  constraint product_option_values_identity_unique unique (option_group_id, id)
);

create table public.product_variant_option_values (
  product_version_id uuid not null,
  product_variant_version_id uuid not null,
  option_group_id uuid not null,
  option_value_id uuid not null,
  primary key (product_variant_version_id, option_group_id),
  constraint product_variant_option_values_variant_fk
    foreign key (product_version_id, product_variant_version_id)
    references public.product_variant_versions (product_version_id, id)
    on delete restrict,
  constraint product_variant_option_values_group_fk
    foreign key (product_version_id, option_group_id)
    references public.product_option_groups (product_version_id, id)
    on delete restrict,
  constraint product_variant_option_values_value_fk
    foreign key (option_group_id, option_value_id)
    references public.product_option_values (option_group_id, id)
    on delete restrict
);

create table public.product_media (
  product_version_id uuid not null references public.product_versions (id) on delete restrict,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  display_order smallint not null,
  primary key (product_version_id, media_asset_id),
  constraint product_media_order check (display_order between 0 and 11),
  constraint product_media_order_unique unique (product_version_id, display_order)
);

create table public.product_related_products (
  product_id uuid not null,
  product_version_id uuid not null,
  related_product_id uuid not null references public.products (id) on delete restrict,
  display_order smallint not null,
  primary key (product_version_id, related_product_id),
  constraint product_related_products_version_fk
    foreign key (product_id, product_version_id)
    references public.product_versions (product_id, id)
    on delete restrict,
  constraint product_related_products_not_self check (product_id <> related_product_id),
  constraint product_related_products_order check (display_order between 0 and 11),
  constraint product_related_products_order_unique unique (product_version_id, display_order)
);

create index products_archived_updated_idx on public.products (archived_at, updated_at desc);
create index product_versions_category_idx on public.product_versions (category_id);
create index product_variants_product_idx on public.product_variants (product_id);
create index product_variant_versions_product_idx on public.product_variant_versions (product_id, product_version_id);
create index product_media_asset_idx on public.product_media (media_asset_id);
create index product_related_target_idx on public.product_related_products (related_product_id);

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create function private.is_valid_product_option_groups(input_groups jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  group_definition jsonb;
  value_definition jsonb;
  group_key text;
  value_key text;
  seen_group_keys text[] := array[]::text[];
  seen_value_keys text[];
begin
  if input_groups is null
    or pg_catalog.jsonb_typeof(input_groups) <> 'array'
    or pg_catalog.jsonb_array_length(input_groups) > 3
  then
    return false;
  end if;

  for group_definition in
    select value from pg_catalog.jsonb_array_elements(input_groups)
  loop
    if pg_catalog.jsonb_typeof(group_definition) <> 'object'
      or not group_definition ?& array['key', 'name', 'values']
      or exists (
        select 1
        from pg_catalog.jsonb_object_keys(group_definition) as property
        where property not in ('key', 'name', 'values')
      )
      or pg_catalog.jsonb_typeof(group_definition -> 'key') <> 'string'
      or pg_catalog.jsonb_typeof(group_definition -> 'name') <> 'string'
      or pg_catalog.jsonb_typeof(group_definition -> 'values') <> 'array'
      or pg_catalog.jsonb_array_length(group_definition -> 'values') not between 1 and 20
    then
      return false;
    end if;

    group_key := group_definition ->> 'key';

    if group_key !~ '^[a-z][a-z0-9_]{0,39}$'
      or group_key = any(seen_group_keys)
      or group_definition ->> 'name' <> pg_catalog.btrim(group_definition ->> 'name')
      or pg_catalog.char_length(group_definition ->> 'name') not between 1 and 50
    then
      return false;
    end if;

    seen_group_keys := pg_catalog.array_append(seen_group_keys, group_key);
    seen_value_keys := array[]::text[];

    for value_definition in
      select value
      from pg_catalog.jsonb_array_elements(group_definition -> 'values')
    loop
      if pg_catalog.jsonb_typeof(value_definition) <> 'object'
        or not value_definition ?& array['key', 'label']
        or exists (
          select 1
          from pg_catalog.jsonb_object_keys(value_definition) as property
          where property not in ('key', 'label')
        )
        or pg_catalog.jsonb_typeof(value_definition -> 'key') <> 'string'
        or pg_catalog.jsonb_typeof(value_definition -> 'label') <> 'string'
      then
        return false;
      end if;

      value_key := value_definition ->> 'key';

      if value_key !~ '^[a-z0-9][a-z0-9_-]{0,49}$'
        or value_key = any(seen_value_keys)
        or value_definition ->> 'label' <> pg_catalog.btrim(value_definition ->> 'label')
        or pg_catalog.char_length(value_definition ->> 'label') not between 1 and 80
      then
        return false;
      end if;

      seen_value_keys := pg_catalog.array_append(seen_value_keys, value_key);
    end loop;
  end loop;

  return true;
end;
$$;

create function private.is_valid_product_variants(input_variants jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  variant_definition jsonb;
  variant_id_text text;
  sku_text text;
  option_entry record;
begin
  if input_variants is null
    or pg_catalog.jsonb_typeof(input_variants) <> 'array'
    or pg_catalog.jsonb_array_length(input_variants) not between 1 and 100
  then
    return false;
  end if;

  for variant_definition in
    select value from pg_catalog.jsonb_array_elements(input_variants)
  loop
    if pg_catalog.jsonb_typeof(variant_definition) <> 'object'
      or not variant_definition ?& array[
        'id',
        'sku',
        'priceMinor',
        'availability',
        'optionValues'
      ]
      or exists (
        select 1
        from pg_catalog.jsonb_object_keys(variant_definition) as property
        where property not in (
          'id',
          'sku',
          'priceMinor',
          'availability',
          'optionValues'
        )
      )
      or pg_catalog.jsonb_typeof(variant_definition -> 'optionValues') <> 'object'
      or pg_catalog.jsonb_typeof(variant_definition -> 'priceMinor') <> 'string'
      or pg_catalog.jsonb_typeof(variant_definition -> 'availability') <> 'string'
      or (variant_definition ->> 'priceMinor') !~ '^[0-9]{1,10}$'
      or (variant_definition ->> 'priceMinor')::numeric not between 1 and 9999999999
      or variant_definition ->> 'availability' not in (
        'available',
        'low_stock',
        'coming_soon',
        'unavailable'
      )
    then
      return false;
    end if;

    variant_id_text := variant_definition ->> 'id';
    if variant_id_text is not null
      and variant_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      return false;
    end if;

    if pg_catalog.jsonb_typeof(variant_definition -> 'sku') not in ('string', 'null') then
      return false;
    end if;

    sku_text := variant_definition ->> 'sku';
    if sku_text is not null
      and (
        sku_text <> pg_catalog.btrim(sku_text)
        or pg_catalog.char_length(sku_text) not between 1 and 64
        or sku_text !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$'
      )
    then
      return false;
    end if;

    for option_entry in
      select key, value
      from pg_catalog.jsonb_each(variant_definition -> 'optionValues')
    loop
      if option_entry.key !~ '^[a-z][a-z0-9_]{0,39}$'
        or pg_catalog.jsonb_typeof(option_entry.value) <> 'string'
        or option_entry.value #>> '{}' !~ '^[a-z0-9][a-z0-9_-]{0,49}$'
      then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

create function private.is_valid_product_specifications(
  input_category_id uuid,
  input_specifications jsonb
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  field_schema jsonb;
  field_definition jsonb;
  field_key text;
  field_type text;
  field_value jsonb;
begin
  if input_specifications is null
    or pg_catalog.jsonb_typeof(input_specifications) <> 'object'
  then
    return false;
  end if;

  select versions.field_schema
  into field_schema
  from public.categories as categories
  join public.category_versions as versions
    on versions.id = categories.current_draft_version_id
  where categories.id = input_category_id
    and categories.archived_at is null;

  if field_schema is null then
    return false;
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(input_specifications) as specification_key
    where not exists (
      select 1
      from pg_catalog.jsonb_array_elements(field_schema) as schema_field
      where schema_field ->> 'key' = specification_key
    )
  ) then
    return false;
  end if;

  for field_definition in
    select value from pg_catalog.jsonb_array_elements(field_schema)
  loop
    field_key := field_definition ->> 'key';
    field_type := field_definition ->> 'type';

    if not input_specifications ? field_key then
      if (field_definition ->> 'required')::boolean then
        return false;
      end if;
      continue;
    end if;

    field_value := input_specifications -> field_key;

    if field_type = 'text' then
      if pg_catalog.jsonb_typeof(field_value) <> 'string'
        or field_value #>> '{}' <> pg_catalog.btrim(field_value #>> '{}')
        or pg_catalog.char_length(field_value #>> '{}') not between 1 and 500
      then
        return false;
      end if;
    elsif field_type in ('number', 'measurement') then
      if pg_catalog.jsonb_typeof(field_value) <> 'number'
        or (field_value #>> '{}')::numeric not between -1000000000000 and 1000000000000
      then
        return false;
      end if;
    elsif field_type = 'boolean' then
      if pg_catalog.jsonb_typeof(field_value) <> 'boolean' then
        return false;
      end if;
    elsif field_type = 'select' then
      if pg_catalog.jsonb_typeof(field_value) <> 'string'
        or not exists (
          select 1
          from pg_catalog.jsonb_array_elements(field_definition -> 'options') as option_definition
          where option_definition ->> 'value' = field_value #>> '{}'
        )
      then
        return false;
      end if;
    elsif field_type = 'multi_select' then
      if pg_catalog.jsonb_typeof(field_value) <> 'array'
        or pg_catalog.jsonb_array_length(field_value) > 30
        or (
          (field_definition ->> 'required')::boolean
          and pg_catalog.jsonb_array_length(field_value) = 0
        )
      then
        return false;
      end if;

      if exists (
        select 1
        from pg_catalog.jsonb_array_elements(field_value) as selected_value
        where pg_catalog.jsonb_typeof(selected_value) <> 'string'
          or not exists (
            select 1
            from pg_catalog.jsonb_array_elements(field_definition -> 'options') as option_definition
            where option_definition ->> 'value' = selected_value #>> '{}'
          )
      ) or (
        select pg_catalog.count(*)
        from pg_catalog.jsonb_array_elements(field_value)
      ) <> (
        select pg_catalog.count(distinct selected_value #>> '{}')
        from pg_catalog.jsonb_array_elements(field_value) as selected_value
      ) then
        return false;
      end if;
    else
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke execute on function private.is_valid_product_option_groups(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function private.is_valid_product_variants(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function private.is_valid_product_specifications(uuid, jsonb)
from public, anon, authenticated, service_role;

create function private.claim_product_slug(input_slug text, input_product_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  claimed_product_id uuid;
begin
  select product_id
  into claimed_product_id
  from public.product_slug_claims
  where slug = input_slug;

  if found and claimed_product_id <> input_product_id then
    raise exception using errcode = 'P0001', message = 'product_slug_conflict';
  end if;

  insert into public.product_slug_claims (slug, product_id)
  values (input_slug, input_product_id)
  on conflict (slug) do nothing;
end;
$$;

create function private.claim_product_sku(input_sku text, input_variant_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  claimed_variant_id uuid;
  normalized_input text := pg_catalog.lower(input_sku);
begin
  if input_sku is null then
    return;
  end if;

  select product_variant_id
  into claimed_variant_id
  from public.product_sku_claims
  where normalized_sku = normalized_input;

  if found and claimed_variant_id <> input_variant_id then
    raise exception using errcode = 'P0001', message = 'product_sku_conflict';
  end if;

  insert into public.product_sku_claims (normalized_sku, product_variant_id)
  values (normalized_input, input_variant_id)
  on conflict (normalized_sku) do nothing;
end;
$$;

revoke execute on function private.claim_product_slug(text, uuid)
from public, anon, authenticated, service_role;
revoke execute on function private.claim_product_sku(text, uuid)
from public, anon, authenticated, service_role;

create function private.append_product_version(
  input_product_id uuid,
  input_revision bigint,
  input_name text,
  input_slug text,
  input_category_id uuid,
  input_short_description text,
  input_description text,
  input_tags text[],
  input_specifications jsonb,
  input_featured boolean,
  input_is_new boolean,
  input_seo_title text,
  input_seo_description text,
  input_seo_social_media_asset_id uuid,
  input_base_currency text,
  input_option_groups jsonb,
  input_variants jsonb,
  input_media_asset_ids uuid[],
  input_related_product_ids uuid[],
  input_actor_user_id uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_version_id uuid := gen_random_uuid();
  group_definition jsonb;
  group_position bigint;
  new_group_id uuid;
  value_definition jsonb;
  value_position bigint;
  variant_definition jsonb;
  stable_variant_id uuid;
  new_variant_version_id uuid;
  option_entry record;
  selected_group_id uuid;
  selected_value_id uuid;
  computed_option_signature text;
  group_count integer := pg_catalog.jsonb_array_length(input_option_groups);
begin
  if not private.is_valid_product_option_groups(input_option_groups) then
    raise exception using errcode = 'P0001', message = 'product_option_groups_invalid';
  end if;

  if not private.is_valid_product_variants(input_variants) then
    raise exception using errcode = 'P0001', message = 'product_variants_invalid';
  end if;

  if not private.is_valid_product_specifications(input_category_id, input_specifications) then
    raise exception using errcode = 'P0001', message = 'product_specifications_invalid';
  end if;

  if input_tags is null
    or pg_catalog.cardinality(input_tags) > 20
    or exists (
      select 1
      from pg_catalog.unnest(input_tags) as tag(value)
      where value <> pg_catalog.lower(pg_catalog.btrim(value))
        or pg_catalog.char_length(value) not between 1 and 50
        or value !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    )
    or pg_catalog.cardinality(input_tags) <> (
      select pg_catalog.count(distinct value)
      from pg_catalog.unnest(input_tags) as tag(value)
    )
  then
    raise exception using errcode = 'P0001', message = 'product_tags_invalid';
  end if;

  if input_media_asset_ids is null
    or pg_catalog.cardinality(input_media_asset_ids) not between 1 and 12
    or pg_catalog.cardinality(input_media_asset_ids) <> (
      select pg_catalog.count(distinct media_id)
      from pg_catalog.unnest(input_media_asset_ids) as media(media_id)
    )
    or exists (
      select 1
      from pg_catalog.unnest(input_media_asset_ids) as selected_media(selected_media_id)
      left join public.media_assets as asset on asset.id = selected_media.selected_media_id
      where asset.id is null or asset.status <> 'ready' or asset.alt_text = ''
    )
  then
    raise exception using errcode = 'P0001', message = 'product_media_invalid';
  end if;

  if input_seo_social_media_asset_id is not null
    and not exists (
      select 1
      from public.media_assets
      where id = input_seo_social_media_asset_id
        and status = 'ready'
        and alt_text <> ''
    )
  then
    raise exception using errcode = 'P0001', message = 'product_seo_media_invalid';
  end if;

  if input_related_product_ids is null
    or pg_catalog.cardinality(input_related_product_ids) > 12
    or pg_catalog.cardinality(input_related_product_ids) <> (
      select pg_catalog.count(distinct related_id)
      from pg_catalog.unnest(input_related_product_ids) as related(related_id)
    )
    or input_product_id = any(input_related_product_ids)
    or exists (
      select 1
      from pg_catalog.unnest(input_related_product_ids) as related(related_id)
      left join public.products as related_product on related_product.id = related.related_id
      where related_product.id is null
        or related_product.archived_at is not null
        or related_product.current_draft_version_id is null
    )
  then
    raise exception using errcode = 'P0001', message = 'product_relations_invalid';
  end if;

  insert into public.product_versions (
    id,
    product_id,
    revision,
    category_id,
    name,
    slug,
    short_description,
    description,
    tags,
    specifications,
    featured,
    is_new,
    seo_title,
    seo_description,
    seo_social_media_asset_id,
    base_currency,
    created_by
  )
  values (
    new_version_id,
    input_product_id,
    input_revision,
    input_category_id,
    input_name,
    input_slug,
    input_short_description,
    input_description,
    input_tags,
    input_specifications,
    input_featured,
    input_is_new,
    input_seo_title,
    input_seo_description,
    input_seo_social_media_asset_id,
    input_base_currency,
    input_actor_user_id
  );

  for group_definition, group_position in
    select value, ordinality
    from pg_catalog.jsonb_array_elements(input_option_groups) with ordinality
  loop
    new_group_id := gen_random_uuid();

    insert into public.product_option_groups (
      id,
      product_version_id,
      group_key,
      name,
      display_order
    )
    values (
      new_group_id,
      new_version_id,
      group_definition ->> 'key',
      group_definition ->> 'name',
      group_position - 1
    );

    for value_definition, value_position in
      select value, ordinality
      from pg_catalog.jsonb_array_elements(group_definition -> 'values') with ordinality
    loop
      insert into public.product_option_values (
        product_version_id,
        option_group_id,
        value_key,
        label,
        display_order
      )
      values (
        new_version_id,
        new_group_id,
        value_definition ->> 'key',
        value_definition ->> 'label',
        value_position - 1
      );
    end loop;
  end loop;

  for variant_definition in
    select value
    from pg_catalog.jsonb_array_elements(input_variants)
  loop
    if variant_definition ->> 'id' is null then
      insert into public.product_variants (product_id)
      values (input_product_id)
      returning id into stable_variant_id;
    else
      stable_variant_id := (variant_definition ->> 'id')::uuid;

      if not exists (
        select 1
        from public.product_variants
        where id = stable_variant_id and product_id = input_product_id
      ) then
        raise exception using errcode = 'P0001', message = 'product_variant_identity_invalid';
      end if;
    end if;

    perform private.claim_product_sku(variant_definition ->> 'sku', stable_variant_id);

    if (
      select pg_catalog.count(*)
      from pg_catalog.jsonb_object_keys(variant_definition -> 'optionValues')
    ) <> group_count then
      raise exception using errcode = 'P0001', message = 'product_variant_options_incomplete';
    end if;

    select coalesce(
      pg_catalog.string_agg(entry.key || '=' || entry.value, '|' order by entry.key),
      ''
    )
    into computed_option_signature
    from pg_catalog.jsonb_each_text(variant_definition -> 'optionValues') as entry;

    if exists (
      select 1
      from public.product_variant_versions as existing_variant
      where existing_variant.product_version_id = new_version_id
        and existing_variant.option_signature = computed_option_signature
    ) then
      raise exception using errcode = 'P0001', message = 'product_variant_combination_duplicate';
    end if;

    new_variant_version_id := gen_random_uuid();

    insert into public.product_variant_versions (
      id,
      product_id,
      product_version_id,
      product_variant_id,
      sku,
      option_signature,
      price_minor,
      currency,
      availability,
      created_by
    )
    values (
      new_variant_version_id,
      input_product_id,
      new_version_id,
      stable_variant_id,
      variant_definition ->> 'sku',
      computed_option_signature,
      (variant_definition ->> 'priceMinor')::bigint,
      input_base_currency,
      (variant_definition ->> 'availability')::public.product_availability,
      input_actor_user_id
    );

    for option_entry in
      select key, value
      from pg_catalog.jsonb_each_text(variant_definition -> 'optionValues')
    loop
      select groups.id, option_values.id
      into selected_group_id, selected_value_id
      from public.product_option_groups as groups
      join public.product_option_values as option_values
        on option_values.option_group_id = groups.id
      where groups.product_version_id = new_version_id
        and groups.group_key = option_entry.key
        and option_values.value_key = option_entry.value;

      if selected_group_id is null or selected_value_id is null then
        raise exception using errcode = 'P0001', message = 'product_variant_option_invalid';
      end if;

      insert into public.product_variant_option_values (
        product_version_id,
        product_variant_version_id,
        option_group_id,
        option_value_id
      )
      values (
        new_version_id,
        new_variant_version_id,
        selected_group_id,
        selected_value_id
      );
    end loop;
  end loop;

  insert into public.product_media (
    product_version_id,
    media_asset_id,
    display_order
  )
  select new_version_id, media_id, ordinality - 1
  from pg_catalog.unnest(input_media_asset_ids) with ordinality as selected_media(media_id, ordinality);

  insert into public.product_related_products (
    product_id,
    product_version_id,
    related_product_id,
    display_order
  )
  select input_product_id, new_version_id, related_id, ordinality - 1
  from pg_catalog.unnest(input_related_product_ids) with ordinality as selected_related(related_id, ordinality);

  insert into public.media_asset_references (
    media_asset_id,
    reference_type,
    reference_id
  )
  select referenced_media_id, 'product_version', new_version_id
  from (
    select media_id as referenced_media_id
    from pg_catalog.unnest(input_media_asset_ids) as media_id
    union
    select input_seo_social_media_asset_id
    where input_seo_social_media_asset_id is not null
  ) as referenced_media;

  return new_version_id;
end;
$$;

revoke execute on function private.append_product_version(
  uuid,
  bigint,
  text,
  text,
  uuid,
  text,
  text,
  text[],
  jsonb,
  boolean,
  boolean,
  text,
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  uuid[],
  uuid[],
  uuid
) from public, anon, authenticated, service_role;

create function public.create_product_draft(
  input_name text,
  input_slug text,
  input_category_id uuid,
  input_short_description text,
  input_description text,
  input_tags text[],
  input_specifications jsonb,
  input_featured boolean,
  input_is_new boolean,
  input_seo_title text,
  input_seo_description text,
  input_seo_social_media_asset_id uuid,
  input_base_currency text,
  input_option_groups jsonb,
  input_variants jsonb,
  input_media_asset_ids uuid[],
  input_related_product_ids uuid[],
  request_correlation_id uuid
)
returns public.product_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  new_product_id uuid := gen_random_uuid();
  new_version_id uuid;
begin
  if actor_user_id is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'product_not_authorized';
  end if;

  insert into public.products (id) values (new_product_id);
  perform private.claim_product_slug(input_slug, new_product_id);

  new_version_id := private.append_product_version(
    new_product_id,
    1,
    input_name,
    input_slug,
    input_category_id,
    input_short_description,
    input_description,
    input_tags,
    input_specifications,
    input_featured,
    input_is_new,
    input_seo_title,
    input_seo_description,
    input_seo_social_media_asset_id,
    input_base_currency,
    input_option_groups,
    input_variants,
    input_media_asset_ids,
    input_related_product_ids,
    actor_user_id
  );

  update public.products
  set current_draft_version_id = new_version_id, draft_revision = 1
  where id = new_product_id;

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
    'product.create',
    'product',
    new_product_id,
    request_correlation_id,
    'success'
  );

  return (new_product_id, 1)::public.product_mutation_result;
end;
$$;

create function public.update_product_draft(
  input_product_id uuid,
  expected_revision bigint,
  input_name text,
  input_slug text,
  input_category_id uuid,
  input_short_description text,
  input_description text,
  input_tags text[],
  input_specifications jsonb,
  input_featured boolean,
  input_is_new boolean,
  input_seo_title text,
  input_seo_description text,
  input_seo_social_media_asset_id uuid,
  input_base_currency text,
  input_option_groups jsonb,
  input_variants jsonb,
  input_media_asset_ids uuid[],
  input_related_product_ids uuid[],
  request_correlation_id uuid
)
returns public.product_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  product_record public.products%rowtype;
  next_revision bigint;
  new_version_id uuid;
begin
  if actor_user_id is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'product_not_authorized';
  end if;

  select *
  into product_record
  from public.products
  where id = input_product_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'product_not_found';
  end if;

  if product_record.archived_at is not null then
    raise exception using errcode = 'P0001', message = 'product_archived';
  end if;

  if product_record.draft_revision <> expected_revision then
    raise exception using errcode = 'P0001', message = 'product_stale_revision';
  end if;

  perform private.claim_product_slug(input_slug, input_product_id);
  next_revision := product_record.draft_revision + 1;

  new_version_id := private.append_product_version(
    input_product_id,
    next_revision,
    input_name,
    input_slug,
    input_category_id,
    input_short_description,
    input_description,
    input_tags,
    input_specifications,
    input_featured,
    input_is_new,
    input_seo_title,
    input_seo_description,
    input_seo_social_media_asset_id,
    input_base_currency,
    input_option_groups,
    input_variants,
    input_media_asset_ids,
    input_related_product_ids,
    actor_user_id
  );

  update public.products
  set current_draft_version_id = new_version_id, draft_revision = next_revision
  where id = input_product_id;

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
    'product.update',
    'product',
    input_product_id,
    request_correlation_id,
    'success'
  );

  return (input_product_id, next_revision)::public.product_mutation_result;
end;
$$;

create function public.archive_product(
  input_product_id uuid,
  expected_revision bigint,
  request_correlation_id uuid
)
returns public.product_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  product_record public.products%rowtype;
  next_revision bigint;
begin
  if actor_user_id is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'product_not_authorized';
  end if;

  select * into product_record
  from public.products
  where id = input_product_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'product_not_found';
  end if;

  if product_record.archived_at is not null then
    raise exception using errcode = 'P0001', message = 'product_already_archived';
  end if;

  if product_record.draft_revision <> expected_revision then
    raise exception using errcode = 'P0001', message = 'product_stale_revision';
  end if;

  next_revision := product_record.draft_revision + 1;

  update public.products
  set
    archived_at = pg_catalog.clock_timestamp(),
    archived_by = actor_user_id,
    draft_revision = next_revision
  where id = input_product_id;

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
    'admin', actor_user_id, 'product.archive', 'product', input_product_id,
    request_correlation_id, 'success'
  );

  return (input_product_id, next_revision)::public.product_mutation_result;
end;
$$;

create function public.restore_product(
  input_product_id uuid,
  expected_revision bigint,
  request_correlation_id uuid
)
returns public.product_mutation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  product_record public.products%rowtype;
  category_id uuid;
  next_revision bigint;
begin
  if actor_user_id is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'product_not_authorized';
  end if;

  select * into product_record
  from public.products
  where id = input_product_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'product_not_found';
  end if;

  if product_record.archived_at is null then
    raise exception using errcode = 'P0001', message = 'product_not_archived';
  end if;

  if product_record.draft_revision <> expected_revision then
    raise exception using errcode = 'P0001', message = 'product_stale_revision';
  end if;

  select versions.category_id
  into category_id
  from public.product_versions as versions
  where versions.id = product_record.current_draft_version_id;

  if not exists (
    select 1 from public.categories
    where id = category_id and archived_at is null and current_draft_version_id is not null
  ) then
    raise exception using errcode = 'P0001', message = 'product_category_unavailable';
  end if;

  next_revision := product_record.draft_revision + 1;

  update public.products
  set archived_at = null, archived_by = null, draft_revision = next_revision
  where id = input_product_id;

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
    'admin', actor_user_id, 'product.restore', 'product', input_product_id,
    request_correlation_id, 'success'
  );

  return (input_product_id, next_revision)::public.product_mutation_result;
end;
$$;

create function private.prevent_archiving_category_with_products()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.archived_at is null
    and new.archived_at is not null
    and exists (
      select 1
      from public.products as products
      join public.product_versions as versions
        on versions.id = products.current_draft_version_id
      where products.archived_at is null
        and versions.category_id = old.id
    )
  then
    raise exception using errcode = 'P0001', message = 'category_has_products';
  end if;

  return new;
end;
$$;

revoke execute on function private.prevent_archiving_category_with_products()
from public, anon, authenticated, service_role;

create trigger categories_prevent_archive_with_products
before update of archived_at on public.categories
for each row execute function private.prevent_archiving_category_with_products();

alter table public.products enable row level security;
alter table public.product_slug_claims enable row level security;
alter table public.product_versions enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_sku_claims enable row level security;
alter table public.product_variant_versions enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.product_option_values enable row level security;
alter table public.product_variant_option_values enable row level security;
alter table public.product_media enable row level security;
alter table public.product_related_products enable row level security;

revoke all on table public.products from public, anon, authenticated, service_role;
revoke all on table public.product_slug_claims from public, anon, authenticated, service_role;
revoke all on table public.product_versions from public, anon, authenticated, service_role;
revoke all on table public.product_variants from public, anon, authenticated, service_role;
revoke all on table public.product_sku_claims from public, anon, authenticated, service_role;
revoke all on table public.product_variant_versions from public, anon, authenticated, service_role;
revoke all on table public.product_option_groups from public, anon, authenticated, service_role;
revoke all on table public.product_option_values from public, anon, authenticated, service_role;
revoke all on table public.product_variant_option_values from public, anon, authenticated, service_role;
revoke all on table public.product_media from public, anon, authenticated, service_role;
revoke all on table public.product_related_products from public, anon, authenticated, service_role;

grant select on table public.products to authenticated, service_role;
grant select on table public.product_slug_claims to authenticated, service_role;
grant select on table public.product_versions to authenticated, service_role;
grant select on table public.product_variants to authenticated, service_role;
grant select on table public.product_sku_claims to authenticated, service_role;
grant select on table public.product_variant_versions to authenticated, service_role;
grant select on table public.product_option_groups to authenticated, service_role;
grant select on table public.product_option_values to authenticated, service_role;
grant select on table public.product_variant_option_values to authenticated, service_role;
grant select on table public.product_media to authenticated, service_role;
grant select on table public.product_related_products to authenticated, service_role;

create policy products_select_admin on public.products
for select to authenticated using ((select public.is_admin()));
create policy product_slug_claims_select_admin on public.product_slug_claims
for select to authenticated using ((select public.is_admin()));
create policy product_versions_select_admin on public.product_versions
for select to authenticated using ((select public.is_admin()));
create policy product_variants_select_admin on public.product_variants
for select to authenticated using ((select public.is_admin()));
create policy product_sku_claims_select_admin on public.product_sku_claims
for select to authenticated using ((select public.is_admin()));
create policy product_variant_versions_select_admin on public.product_variant_versions
for select to authenticated using ((select public.is_admin()));
create policy product_option_groups_select_admin on public.product_option_groups
for select to authenticated using ((select public.is_admin()));
create policy product_option_values_select_admin on public.product_option_values
for select to authenticated using ((select public.is_admin()));
create policy product_variant_option_values_select_admin on public.product_variant_option_values
for select to authenticated using ((select public.is_admin()));
create policy product_media_select_admin on public.product_media
for select to authenticated using ((select public.is_admin()));
create policy product_related_products_select_admin on public.product_related_products
for select to authenticated using ((select public.is_admin()));

revoke execute on function public.create_product_draft(
  text, text, uuid, text, text, text[], jsonb, boolean, boolean, text, text,
  uuid, text, jsonb, jsonb, uuid[], uuid[], uuid
) from public, anon, authenticated, service_role;
revoke execute on function public.update_product_draft(
  uuid, bigint, text, text, uuid, text, text, text[], jsonb, boolean, boolean,
  text, text, uuid, text, jsonb, jsonb, uuid[], uuid[], uuid
) from public, anon, authenticated, service_role;
revoke execute on function public.archive_product(uuid, bigint, uuid)
from public, anon, authenticated, service_role;
revoke execute on function public.restore_product(uuid, bigint, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.create_product_draft(
  text, text, uuid, text, text, text[], jsonb, boolean, boolean, text, text,
  uuid, text, jsonb, jsonb, uuid[], uuid[], uuid
) to authenticated;
grant execute on function public.update_product_draft(
  uuid, bigint, text, text, uuid, text, text, text[], jsonb, boolean, boolean,
  text, text, uuid, text, jsonb, jsonb, uuid[], uuid[], uuid
) to authenticated;
grant execute on function public.archive_product(uuid, bigint, uuid)
to authenticated;
grant execute on function public.restore_product(uuid, bigint, uuid)
to authenticated;

comment on table public.products is 'Stable product identities with draft and published version pointers';
comment on table public.product_versions is 'Append-only product copy, taxonomy, merchandising, specification, SEO, and currency snapshots';
comment on table public.product_variants is 'Stable V2-compatible variant identities';
comment on table public.product_variant_versions is 'Append-only SKU, price, availability, and option-combination snapshots';
comment on table public.product_option_groups is 'Relational option groups owned by an immutable product version';
comment on table public.product_option_values is 'Relational option values owned by an immutable product option group';
comment on table public.product_media is 'Ordered gallery references for an immutable product version';
comment on table public.product_related_products is 'Ordered related-product references for an immutable product version';
