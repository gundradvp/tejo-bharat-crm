/* Fix loan_applications.tenant_id missing default — same pattern as the
   loan_disbursements fix. Allows inserts that omit tenant_id to inherit
   the authenticated user's tenant. */
ALTER TABLE loan_applications
  ALTER COLUMN tenant_id SET DEFAULT get_current_user_tenant_id();
