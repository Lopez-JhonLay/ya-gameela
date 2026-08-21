-- Fake local non-Google identities for development and automated tests only.
-- Database tests create their own admin binding inside a rolled-back transaction.
-- Local runtime intentionally starts without an administrator so that the first
-- approved Google login can create the single stable binding.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@ya-gameela.test',
    extensions.crypt('LocalOnlyPassword123!', extensions.gen_salt('bf')),
    '2026-01-01 00:00:00+00',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Local Admin"}'::jsonb,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'visitor@ya-gameela.test',
    extensions.crypt('LocalOnlyPassword123!', extensions.gen_salt('bf')),
    '2026-01-01 00:00:00+00',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Local Non-Admin"}'::jsonb,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"admin@ya-gameela.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '{"sub":"10000000-0000-4000-8000-000000000002","email":"visitor@ya-gameela.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  );

-- Local draft catalog content only. Task 33 replaces or approves production
-- content before launch.
insert into public.categories (id)
values
  ('71000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-000000000002'),
  ('71000000-0000-4000-8000-000000000003'),
  ('71000000-0000-4000-8000-000000000004');

insert into public.category_versions (
  id,
  category_id,
  revision,
  name,
  slug,
  description,
  display_order,
  field_schema,
  seo_title,
  seo_description,
  created_by,
  created_at
)
values
  (
    '72000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    1,
    'Perfumes',
    'perfumes',
    'Local draft category for fragrance products.',
    10,
    '[{"key":"fragrance_family","label":"Fragrance family","type":"select","required":false,"filterable":true,"options":[{"value":"floral","label":"Floral"},{"value":"fresh","label":"Fresh"},{"value":"woody","label":"Woody"}]},{"key":"volume","label":"Volume","type":"measurement","required":true,"filterable":true,"unit":"ml"}]'::jsonb,
    'Perfumes',
    'Explore the local draft perfume category.',
    '10000000-0000-4000-8000-000000000001',
    '2026-01-01 00:00:00+00'
  ),
  (
    '72000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    1,
    'Bags',
    'bags',
    'Local draft category for bag products.',
    20,
    '[{"key":"material","label":"Material","type":"select","required":false,"filterable":true,"options":[{"value":"leather","label":"Leather"},{"value":"canvas","label":"Canvas"}]},{"key":"color","label":"Color","type":"multi_select","required":false,"filterable":true,"options":[{"value":"black","label":"Black"},{"value":"neutral","label":"Neutral"}]}]'::jsonb,
    'Bags',
    'Explore the local draft bags category.',
    '10000000-0000-4000-8000-000000000001',
    '2026-01-01 00:00:00+00'
  ),
  (
    '72000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000003',
    1,
    'Beauty',
    'beauty',
    'Local draft category for beauty products.',
    30,
    '[{"key":"skin_type","label":"Skin type","type":"multi_select","required":false,"filterable":true,"options":[{"value":"dry","label":"Dry"},{"value":"oily","label":"Oily"},{"value":"combination","label":"Combination"}]},{"key":"shade","label":"Shade","type":"text","required":false,"filterable":false}]'::jsonb,
    'Beauty',
    'Explore the local draft beauty category.',
    '10000000-0000-4000-8000-000000000001',
    '2026-01-01 00:00:00+00'
  ),
  (
    '72000000-0000-4000-8000-000000000004',
    '71000000-0000-4000-8000-000000000004',
    1,
    'Clothing',
    'clothing',
    'Local draft category for fashion clothing.',
    40,
    '[{"key":"material","label":"Material","type":"text","required":false,"filterable":false},{"key":"size","label":"Size","type":"multi_select","required":true,"filterable":true,"options":[{"value":"small","label":"Small"},{"value":"medium","label":"Medium"},{"value":"large","label":"Large"}]}]'::jsonb,
    'Clothing',
    'Explore the local draft clothing category.',
    '10000000-0000-4000-8000-000000000001',
    '2026-01-01 00:00:00+00'
  );

insert into public.category_slug_claims (slug, category_id, claimed_at)
values
  ('perfumes', '71000000-0000-4000-8000-000000000001', '2026-01-01 00:00:00+00'),
  ('bags', '71000000-0000-4000-8000-000000000002', '2026-01-01 00:00:00+00'),
  ('beauty', '71000000-0000-4000-8000-000000000003', '2026-01-01 00:00:00+00'),
  ('clothing', '71000000-0000-4000-8000-000000000004', '2026-01-01 00:00:00+00');

update public.categories as categories
set
  current_draft_version_id = versions.id,
  draft_revision = versions.revision
from public.category_versions as versions
where versions.category_id = categories.id;
