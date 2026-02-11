GRANT USAGE ON SCHEMA meta TO app_profile;
GRANT USAGE ON SCHEMA profile TO app_profile;

GRANT EXECUTE ON FUNCTION meta.current_tenant() TO app_profile;
GRANT EXECUTE ON FUNCTION meta.require_tenant() TO app_profile;
GRANT EXECUTE ON FUNCTION meta.current_tenant_id() TO app_profile;
GRANT EXECUTE ON FUNCTION meta.require_tenant_id() TO app_profile;
GRANT EXECUTE ON FUNCTION meta.uuid_v4() TO app_profile;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA profile TO app_profile;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA profile TO app_profile;
