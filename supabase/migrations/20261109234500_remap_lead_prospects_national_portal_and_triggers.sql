-- Migration: Remap lead_prospects from national_portal_applications and install automatic sync triggers
-- Generated: 2026-11-09

-- 1. Create indexes for maximum performance on joins and queries
CREATE INDEX IF NOT EXISTS idx_lead_prospects_sc_number ON public.lead_prospects(sc_number);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_national_portal_status ON public.lead_prospects(national_portal_status);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_np_registration_number ON public.lead_prospects(np_registration_number);
CREATE INDEX IF NOT EXISTS idx_national_portal_applications_sc ON public.national_portal_applications(sc);

-- 2. Clear existing mapping completely on lead_prospects
UPDATE public.lead_prospects
SET
  national_portal_status = NULL,
  np_registration_number = NULL
WHERE national_portal_status IS NOT NULL OR np_registration_number IS NOT NULL;

-- 3. Remap / Rebuild from scratch by joining with national_portal_applications on sc_number = sc
WITH latest_npa AS (
  SELECT DISTINCT ON (TRIM(sc))
    TRIM(sc) AS sc,
    step,
    app_num,
    cap,
    name,
    phone
  FROM public.national_portal_applications
  WHERE sc IS NOT NULL AND TRIM(sc) <> ''
  ORDER BY TRIM(sc), submission_date DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.lead_prospects lp
SET
  national_portal_status = n.step,
  np_registration_number = n.app_num,
  applied_solar_load_kw = COALESCE(lp.applied_solar_load_kw, n.cap),
  customer_name = COALESCE(NULLIF(TRIM(lp.customer_name), ''), NULLIF(TRIM(n.name), '')),
  mobile_number = COALESCE(NULLIF(TRIM(lp.mobile_number), ''), NULLIF(TRIM(n.phone), '')),
  updated_at = NOW()
FROM latest_npa n
WHERE TRIM(lp.sc_number) = n.sc;

-- 4. Trigger Function: Automatically update matching lead_prospects when records are inserted/updated in national_portal_applications
CREATE OR REPLACE FUNCTION public.trg_fn_sync_npa_to_lead_prospects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.sc IS NOT NULL AND TRIM(NEW.sc) <> '' THEN
    UPDATE public.lead_prospects
    SET
      national_portal_status = COALESCE(NEW.step, national_portal_status),
      np_registration_number = COALESCE(NEW.app_num, np_registration_number),
      applied_solar_load_kw = COALESCE(applied_solar_load_kw, NEW.cap),
      customer_name = COALESCE(NULLIF(TRIM(customer_name), ''), NULLIF(TRIM(NEW.name), '')),
      mobile_number = COALESCE(NULLIF(TRIM(mobile_number), ''), NULLIF(TRIM(NEW.phone), '')),
      updated_at = NOW()
    WHERE TRIM(sc_number) = TRIM(NEW.sc);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_npa_to_lead_prospects ON public.national_portal_applications;
CREATE TRIGGER trg_sync_npa_to_lead_prospects
AFTER INSERT OR UPDATE ON public.national_portal_applications
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_sync_npa_to_lead_prospects();

-- 5. Trigger Function: Automatically map lead_prospects from national_portal_applications when a new prospect is inserted
CREATE OR REPLACE FUNCTION public.trg_fn_sync_lead_prospects_from_npa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matched_npa RECORD;
BEGIN
  IF NEW.sc_number IS NOT NULL AND TRIM(NEW.sc_number) <> '' THEN
    SELECT step, app_num, cap, name, phone
    INTO matched_npa
    FROM public.national_portal_applications
    WHERE TRIM(sc) = TRIM(NEW.sc_number)
    ORDER BY submission_date DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      IF NEW.national_portal_status IS NULL OR TRIM(NEW.national_portal_status) = '' THEN
        NEW.national_portal_status := matched_npa.step;
      END IF;
      IF NEW.np_registration_number IS NULL OR TRIM(NEW.np_registration_number) = '' THEN
        NEW.np_registration_number := matched_npa.app_num;
      END IF;
      IF NEW.applied_solar_load_kw IS NULL THEN
        NEW.applied_solar_load_kw := matched_npa.cap;
      END IF;
      IF (NEW.customer_name IS NULL OR TRIM(NEW.customer_name) = '') AND matched_npa.name IS NOT NULL THEN
        NEW.customer_name := TRIM(matched_npa.name);
      END IF;
      IF (NEW.mobile_number IS NULL OR TRIM(NEW.mobile_number) = '') AND matched_npa.phone IS NOT NULL THEN
        NEW.mobile_number := TRIM(matched_npa.phone);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_prospects_from_npa ON public.lead_prospects;
CREATE TRIGGER trg_sync_lead_prospects_from_npa
BEFORE INSERT OR UPDATE OF sc_number ON public.lead_prospects
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_sync_lead_prospects_from_npa();

-- 6. RPC Function to allow one-click remap anytime from UI / Admin
CREATE OR REPLACE FUNCTION public.remap_all_lead_prospects_from_national_portal()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleared_count INT;
  remapped_count INT;
BEGIN
  -- Clear
  UPDATE public.lead_prospects
  SET
    national_portal_status = NULL,
    np_registration_number = NULL
  WHERE national_portal_status IS NOT NULL OR np_registration_number IS NOT NULL;
  GET DIAGNOSTICS cleared_count = ROW_COUNT;

  -- Rebuild
  WITH latest_npa AS (
    SELECT DISTINCT ON (TRIM(sc))
      TRIM(sc) AS sc,
      step,
      app_num,
      cap,
      name,
      phone
    FROM public.national_portal_applications
    WHERE sc IS NOT NULL AND TRIM(sc) <> ''
    ORDER BY TRIM(sc), submission_date DESC NULLS LAST, created_at DESC NULLS LAST
  )
  UPDATE public.lead_prospects lp
  SET
    national_portal_status = n.step,
    np_registration_number = n.app_num,
    applied_solar_load_kw = COALESCE(lp.applied_solar_load_kw, n.cap),
    customer_name = COALESCE(NULLIF(TRIM(lp.customer_name), ''), NULLIF(TRIM(n.name), '')),
    mobile_number = COALESCE(NULLIF(TRIM(lp.mobile_number), ''), NULLIF(TRIM(n.phone), '')),
    updated_at = NOW()
  FROM latest_npa n
  WHERE TRIM(lp.sc_number) = n.sc;
  GET DIAGNOSTICS remapped_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'cleared_count', cleared_count,
    'remapped_count', remapped_count,
    'timestamp', NOW()
  );
END;
$$;
