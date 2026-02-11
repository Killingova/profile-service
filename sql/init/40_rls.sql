ALTER TABLE profile.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile.profile_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile.outbox_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE profile.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE profile.preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE profile.profile_events FORCE ROW LEVEL SECURITY;
ALTER TABLE profile.outbox_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_tenant ON profile.profiles;
DROP POLICY IF EXISTS profiles_insert_tenant ON profile.profiles;
DROP POLICY IF EXISTS profiles_update_tenant ON profile.profiles;
DROP POLICY IF EXISTS profiles_delete_tenant ON profile.profiles;

CREATE POLICY profiles_select_tenant
  ON profile.profiles
  FOR SELECT
  TO PUBLIC
  USING (tenant_id = meta.require_tenant());

CREATE POLICY profiles_insert_tenant
  ON profile.profiles
  FOR INSERT
  TO PUBLIC
  WITH CHECK (tenant_id = meta.require_tenant());

CREATE POLICY profiles_update_tenant
  ON profile.profiles
  FOR UPDATE
  TO PUBLIC
  USING (tenant_id = meta.require_tenant())
  WITH CHECK (tenant_id = meta.require_tenant());

CREATE POLICY profiles_delete_tenant
  ON profile.profiles
  FOR DELETE
  TO PUBLIC
  USING (tenant_id = meta.require_tenant());

DROP POLICY IF EXISTS preferences_select_tenant ON profile.preferences;
DROP POLICY IF EXISTS preferences_insert_tenant ON profile.preferences;
DROP POLICY IF EXISTS preferences_update_tenant ON profile.preferences;
DROP POLICY IF EXISTS preferences_delete_tenant ON profile.preferences;

CREATE POLICY preferences_select_tenant
  ON profile.preferences
  FOR SELECT
  TO PUBLIC
  USING (tenant_id = meta.require_tenant());

CREATE POLICY preferences_insert_tenant
  ON profile.preferences
  FOR INSERT
  TO PUBLIC
  WITH CHECK (tenant_id = meta.require_tenant());

CREATE POLICY preferences_update_tenant
  ON profile.preferences
  FOR UPDATE
  TO PUBLIC
  USING (tenant_id = meta.require_tenant())
  WITH CHECK (tenant_id = meta.require_tenant());

CREATE POLICY preferences_delete_tenant
  ON profile.preferences
  FOR DELETE
  TO PUBLIC
  USING (tenant_id = meta.require_tenant());

DROP POLICY IF EXISTS profile_events_select_tenant ON profile.profile_events;
DROP POLICY IF EXISTS profile_events_insert_tenant ON profile.profile_events;

CREATE POLICY profile_events_select_tenant
  ON profile.profile_events
  FOR SELECT
  TO PUBLIC
  USING (tenant_id = meta.require_tenant());

CREATE POLICY profile_events_insert_tenant
  ON profile.profile_events
  FOR INSERT
  TO PUBLIC
  WITH CHECK (tenant_id = meta.require_tenant());

DROP POLICY IF EXISTS outbox_events_select_tenant ON profile.outbox_events;
DROP POLICY IF EXISTS outbox_events_insert_tenant ON profile.outbox_events;
DROP POLICY IF EXISTS outbox_events_update_tenant ON profile.outbox_events;

CREATE POLICY outbox_events_select_tenant
  ON profile.outbox_events
  FOR SELECT
  TO PUBLIC
  USING (tenant_id = meta.require_tenant());

CREATE POLICY outbox_events_insert_tenant
  ON profile.outbox_events
  FOR INSERT
  TO PUBLIC
  WITH CHECK (tenant_id = meta.require_tenant());

CREATE POLICY outbox_events_update_tenant
  ON profile.outbox_events
  FOR UPDATE
  TO PUBLIC
  USING (tenant_id = meta.require_tenant())
  WITH CHECK (tenant_id = meta.require_tenant());
