CREATE SCHEMA IF NOT EXISTS meta;
CREATE SCHEMA IF NOT EXISTS profile;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE OR REPLACE FUNCTION meta.current_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION meta.require_tenant()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  value uuid;
BEGIN
  value := meta.current_tenant();

  IF value IS NULL THEN
    RAISE EXCEPTION 'Tenant context missing (GUC app.tenant not set)'
      USING ERRCODE = '28000';
  END IF;

  RETURN value;
END;
$$;

CREATE OR REPLACE FUNCTION meta.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT meta.current_tenant()
$$;

CREATE OR REPLACE FUNCTION meta.require_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT meta.require_tenant()
$$;
