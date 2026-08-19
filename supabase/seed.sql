-- Fake local identities for development and automated tests only.
-- These accounts are recreated by `npm run db:reset` and must never be used in production.

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
