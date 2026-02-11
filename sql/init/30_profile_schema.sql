CREATE TABLE IF NOT EXISTS profile.profiles (
  id uuid PRIMARY KEY DEFAULT meta.uuid_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  language varchar(10),
  timezone varchar(64),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT profiles_tenant_user_unique UNIQUE (tenant_id, user_id)
);

ALTER TABLE profile.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE profile.profiles ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE profile.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE profile.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS profile.preferences (
  id uuid PRIMARY KEY DEFAULT meta.uuid_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT preferences_tenant_user_unique UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS profile.profile_events (
  id uuid PRIMARY KEY DEFAULT meta.uuid_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile.outbox_events (
  id uuid PRIMARY KEY DEFAULT meta.uuid_v4(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_events_idempotency_unique
  ON profile.profile_events (tenant_id, user_id, action, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS outbox_events_idempotency_unique
  ON profile.outbox_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS profile_profiles_tenant_idx ON profile.profiles (tenant_id);
CREATE INDEX IF NOT EXISTS profile_profiles_user_idx ON profile.profiles (user_id);
CREATE INDEX IF NOT EXISTS profile_preferences_tenant_idx ON profile.preferences (tenant_id);
CREATE INDEX IF NOT EXISTS profile_events_tenant_created_idx ON profile.profile_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS outbox_events_unpublished_idx ON profile.outbox_events (published_at) WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION profile.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  CREATE TRIGGER trg_profiles_touch_updated_at
    BEFORE UPDATE ON profile.profiles
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION profile.touch_updated_at();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$;

DO $$
BEGIN
  CREATE TRIGGER trg_preferences_touch_updated_at
    BEFORE UPDATE ON profile.preferences
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION profile.touch_updated_at();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$;
