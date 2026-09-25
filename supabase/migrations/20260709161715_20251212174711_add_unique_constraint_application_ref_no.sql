DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_application_ref_no_unique') THEN
    ALTER TABLE customers ADD CONSTRAINT customers_application_ref_no_unique UNIQUE (application_ref_no);
  END IF;
END $$;