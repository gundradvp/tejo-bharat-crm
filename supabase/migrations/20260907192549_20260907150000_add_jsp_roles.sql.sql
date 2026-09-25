/*
  # Add JSP Political Roles

  ## Overview
  This migration adds seven new JSP (Jana Sena Party) role types to the existing
  `roles` table, enabling hierarchical political position-based access control.

  ## 1. Schema Change
  The `roles.name` column has an existing CHECK constraint that limits values to
  'admin', 'lead_generator', 'employee', 'finance', 'lead_generator_access'.
  We replace it with a new constraint that also includes the seven JSP roles.

  ## 2. New Roles Inserted

  | Role Name                  | Display Name              | Description                                    |
  |----------------------------|---------------------------|------------------------------------------------|
  | jsp_admin                  | JSP Admin                 | Full JSP access - all assemblies and reports   |
  | jsp_parliament_incharge    | Parliament Incharge       | Access to all assemblies under their parliament|
  | jsp_assembly_incharge      | Assembly Incharge         | Access to all mandals under their assembly     |
  | jsp_mandal_incharge        | Mandal Incharge           | Access to all panchayats under their mandal    |
  | jsp_village_incharge       | Village/Panchayat Incharge| Access to members in their panchayat           |
  | jsp_booth_incharge         | Booth Incharge            | Access to members in their booth               |
  | jsp_sadhak                 | Sadhak                    | View their own enrolled members                |

  ## 3. Security
  No RLS changes — roles table already has existing policies. The new rows
  inherit the same access rules.
*/

ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

ALTER TABLE roles ADD CONSTRAINT roles_name_check
  CHECK (name IN (
    'admin', 'lead_generator', 'employee', 'finance', 'lead_generator_access',
    'jsp_admin', 'jsp_parliament_incharge', 'jsp_assembly_incharge',
    'jsp_mandal_incharge', 'jsp_village_incharge', 'jsp_booth_incharge',
    'jsp_sadhak'
  ));

INSERT INTO roles (name, display_name, description) VALUES
  ('jsp_admin',                'JSP Admin',                'Full JSP access - all assemblies and reports'),
  ('jsp_parliament_incharge',  'Parliament Incharge',      'Access to all assemblies under their parliament'),
  ('jsp_assembly_incharge',    'Assembly Incharge',        'Access to all mandals under their assembly'),
  ('jsp_mandal_incharge',      'Mandal Incharge',          'Access to all panchayats under their mandal'),
  ('jsp_village_incharge',     'Village/Panchayat Incharge','Access to members in their panchayat'),
  ('jsp_booth_incharge',       'Booth Incharge',           'Access to members in their booth'),
  ('jsp_sadhak',               'Sadhak',                   'View their own enrolled members')
ON CONFLICT (name) DO NOTHING;
