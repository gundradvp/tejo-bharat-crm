
-- Create all Tejo Bharat users with password: TejoBharat@2024
-- Tenant: 00000000-0000-0000-0000-000000000001

DO $$
DECLARE
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  v_role_admin uuid := 'bb0bfbd5-88b6-44f8-b2c3-06fbc11df9c8';
  v_role_employee uuid := '2ed444f5-778b-44fc-bf45-e7d8629fe60e';
  v_role_lead uuid := 'd51c26c2-a143-48b4-947e-149c22bf9509';
  v_enc_pwd text;

  -- Fixed UUIDs for each user
  id_contact    uuid := 'a1000001-0000-0000-0000-000000000001';
  id_jyothsna   uuid := 'a1000001-0000-0000-0000-000000000002';
  id_durga      uuid := 'a1000001-0000-0000-0000-000000000003';
  id_venkatrao  uuid := 'a1000001-0000-0000-0000-000000000004';
  id_nag        uuid := 'a1000001-0000-0000-0000-000000000005';
  id_raj        uuid := 'a1000001-0000-0000-0000-000000000006';
  id_ganga      uuid := 'a1000001-0000-0000-0000-000000000007';
  id_venkat     uuid := 'a1000001-0000-0000-0000-000000000008';
  id_mouli      uuid := 'a1000001-0000-0000-0000-000000000009';
  id_gdv        uuid := '0eb72c13-9440-4ac4-ba3f-9c1f8b294960'; -- existing auth user
BEGIN
  -- Hash the password once
  v_enc_pwd := crypt('TejoBharat@2024', gen_salt('bf'));

  -- ── Insert auth.users (skip existing) ──────────────────────────────────────
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change_token, phone_change, email_change_token_current)
  VALUES
    ('00000000-0000-0000-0000-000000000000', id_contact,   'authenticated', 'authenticated', 'contact@tejobharat.com',   v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Administrator","role":"admin"}'::jsonb,   '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', id_jyothsna,  'authenticated', 'authenticated', 'jyothsna@tejobharat.com',  v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Jyothsna","role":"admin"}'::jsonb,         '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', id_durga,     'authenticated', 'authenticated', 'durga@tejobharat.com',     v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Durga Vara Prasad Gundra","role":"admin"}'::jsonb, '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', id_venkatrao, 'authenticated', 'authenticated', 'venkatrao@tejobharat.com', v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Venkat Akula","role":"admin"}'::jsonb,     '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', id_nag,       'authenticated', 'authenticated', 'nag@tejobharat.com',       v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Nagarjuna","role":"employee"}'::jsonb,     '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', id_raj,       'authenticated', 'authenticated', 'raj@tejobharat.com',       v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Surya Raju","role":"employee"}'::jsonb,    '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', id_ganga,     'authenticated', 'authenticated', 'ganga@tejobharat.com',     v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Gangarao Bandi","role":"employee"}'::jsonb,'', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', id_venkat,    'authenticated', 'authenticated', 'venkat@tejobharat.com',    v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Venkata Ramana","role":"employee"}'::jsonb,'', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', id_mouli,     'authenticated', 'authenticated', 'mouli@tejobharat.com',     v_enc_pwd, now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Chandra Mouli","role":"employee"}'::jsonb, '', '', '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- Also set password for existing gdv user
  UPDATE auth.users SET encrypted_password = v_enc_pwd WHERE id = id_gdv;

  -- ── Insert profiles ─────────────────────────────────────────────────────────
  INSERT INTO profiles (id, email, full_name, role, is_active, tenant_id, created_at, updated_at)
  VALUES
    (id_contact,   'contact@tejobharat.com',   'Administrator',           'admin',    true, v_tenant_id, now(), now()),
    (id_jyothsna,  'jyothsna@tejobharat.com',  'Jyothsna',                'admin',    true, v_tenant_id, now(), now()),
    (id_durga,     'durga@tejobharat.com',      'Durga Vara Prasad Gundra','admin',    true, v_tenant_id, now(), now()),
    (id_venkatrao, 'venkatrao@tejobharat.com',  'Venkat Akula',            'admin',    true, v_tenant_id, now(), now()),
    (id_nag,       'nag@tejobharat.com',        'Nagarjuna',               'employee', true, v_tenant_id, now(), now()),
    (id_raj,       'raj@tejobharat.com',        'Surya Raju',              'employee', true, v_tenant_id, now(), now()),
    (id_ganga,     'ganga@tejobharat.com',      'Gangarao Bandi',          'employee', true, v_tenant_id, now(), now()),
    (id_venkat,    'venkat@tejobharat.com',     'Venkata Ramana',          'employee', true, v_tenant_id, now(), now()),
    (id_mouli,     'mouli@tejobharat.com',      'Chandra Mouli',           'employee', true, v_tenant_id, now(), now()),
    (id_gdv,       'gdv.prasadg@gmail.com',     'Durga Vara Prasad',       'admin',    true, v_tenant_id, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = EXCLUDED.full_name,
    role       = EXCLUDED.role,
    is_active  = EXCLUDED.is_active,
    tenant_id  = EXCLUDED.tenant_id,
    updated_at = now();

  -- ── Insert user_roles ───────────────────────────────────────────────────────
  INSERT INTO user_roles (user_id, role_id, assigned_at)
  VALUES
    (id_contact,   v_role_admin,    now()),
    (id_jyothsna,  v_role_admin,    now()),
    (id_durga,     v_role_admin,    now()),
    (id_venkatrao, v_role_admin,    now()),
    (id_nag,       v_role_employee, now()),
    (id_nag,       v_role_lead,     now()),
    (id_raj,       v_role_employee, now()),
    (id_raj,       v_role_lead,     now()),
    (id_ganga,     v_role_employee, now()),
    (id_ganga,     v_role_lead,     now()),
    (id_venkat,    v_role_employee, now()),
    (id_venkat,    v_role_lead,     now()),
    (id_mouli,     v_role_employee, now()),
    (id_mouli,     v_role_lead,     now()),
    (id_gdv,       v_role_admin,    now())
  ON CONFLICT DO NOTHING;

END $$;
