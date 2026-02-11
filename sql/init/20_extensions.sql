CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping pgcrypto extension creation (insufficient privilege).';
END;
$$;

CREATE OR REPLACE FUNCTION meta.uuid_v4()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  BEGIN
    RETURN extensions.gen_random_uuid();
  EXCEPTION
    WHEN undefined_function THEN
      RETURN gen_random_uuid();
  END;
END;
$$;
