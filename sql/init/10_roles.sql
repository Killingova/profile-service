DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_profile') THEN
    CREATE ROLE app_profile NOLOGIN;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping role creation for app_profile (insufficient privilege).';
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_profile') THEN
    ALTER ROLE app_profile SET search_path = profile,meta,public;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping ALTER ROLE app_profile search_path (insufficient privilege).';
END;
$$;
