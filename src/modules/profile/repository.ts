import type { PoolClient } from "pg";
import { schemaTable } from "../../libs/db";
import type {
  Profile,
  ProfilePatch,
  ProfilePreferences,
} from "./types";

type ProfileRow = {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string | null;
  language: string | null;
  timezone: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

type PreferencesRow = {
  id: string;
  tenantId: string;
  userId: string;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
};

const profilesTable = schemaTable("profiles");
const preferencesTable = schemaTable("preferences");
const profileEventsTable = schemaTable("profile_events");
const outboxEventsTable = schemaTable("outbox_events");

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    displayName: row.displayName,
    language: row.language,
    timezone: row.timezone,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

function toPreferences(row: PreferencesRow): ProfilePreferences {
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    preferences: row.preferences,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export async function findProfile(
  client: PoolClient,
  userId: string,
  tenantId: string,
): Promise<Profile | null> {
  const result = await client.query<ProfileRow>(
    `
      SELECT id,
             user_id AS "userId",
             tenant_id AS "tenantId",
             display_name AS "displayName",
             language,
             timezone,
             deleted_at AS "deletedAt",
             created_at AS "createdAt",
             updated_at AS "updatedAt",
             version
      FROM ${profilesTable}
      WHERE tenant_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [tenantId, userId],
  );

  const row = result.rows[0];
  return row ? toProfile(row) : null;
}

export async function createProfile(
  client: PoolClient,
  userId: string,
  tenantId: string,
): Promise<Profile> {
  const result = await client.query<ProfileRow>(
    `
      INSERT INTO ${profilesTable} (
        tenant_id,
        user_id,
        display_name,
        language,
        timezone,
        deleted_at
      ) VALUES ($1, $2, NULL, NULL, NULL, NULL)
      ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET deleted_at = NULL,
          updated_at = now(),
          version = ${profilesTable}.version + 1
      RETURNING id,
                user_id AS "userId",
                tenant_id AS "tenantId",
                display_name AS "displayName",
                language,
                timezone,
                deleted_at AS "deletedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt",
                version
    `,
    [tenantId, userId],
  );

  return toProfile(result.rows[0]);
}

export async function patchProfile(
  client: PoolClient,
  userId: string,
  tenantId: string,
  patch: ProfilePatch,
): Promise<Profile> {
  const result = await client.query<ProfileRow>(
    `
      UPDATE ${profilesTable}
      SET display_name = CASE WHEN $3::boolean THEN $4::text ELSE display_name END,
          language = CASE WHEN $5::boolean THEN $6::varchar(10) ELSE language END,
          timezone = CASE WHEN $7::boolean THEN $8::varchar(64) ELSE timezone END,
          updated_at = now(),
          version = version + 1
      WHERE tenant_id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING id,
                user_id AS "userId",
                tenant_id AS "tenantId",
                display_name AS "displayName",
                language,
                timezone,
                deleted_at AS "deletedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt",
                version
    `,
    [
      tenantId,
      userId,
      Object.prototype.hasOwnProperty.call(patch, "displayName"),
      patch.displayName ?? null,
      Object.prototype.hasOwnProperty.call(patch, "language"),
      patch.language ?? null,
      Object.prototype.hasOwnProperty.call(patch, "timezone"),
      patch.timezone ?? null,
    ],
  );

  return toProfile(result.rows[0]);
}

export async function getOrCreatePreferences(
  client: PoolClient,
  userId: string,
  tenantId: string,
): Promise<ProfilePreferences> {
  const created = await client.query<PreferencesRow>(
    `
      INSERT INTO ${preferencesTable} (tenant_id, user_id, preferences)
      VALUES ($1, $2, '{}'::jsonb)
      ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET updated_at = ${preferencesTable}.updated_at
      RETURNING id,
                user_id AS "userId",
                tenant_id AS "tenantId",
                preferences,
                created_at AS "createdAt",
                updated_at AS "updatedAt",
                version
    `,
    [tenantId, userId],
  );

  return toPreferences(created.rows[0]);
}

export async function replacePreferences(
  client: PoolClient,
  userId: string,
  tenantId: string,
  preferences: Record<string, unknown>,
): Promise<ProfilePreferences> {
  const result = await client.query<PreferencesRow>(
    `
      INSERT INTO ${preferencesTable} (tenant_id, user_id, preferences)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET preferences = EXCLUDED.preferences,
          updated_at = now(),
          version = ${preferencesTable}.version + 1
      RETURNING id,
                user_id AS "userId",
                tenant_id AS "tenantId",
                preferences,
                created_at AS "createdAt",
                updated_at AS "updatedAt",
                version
    `,
    [tenantId, userId, JSON.stringify(preferences)],
  );

  return toPreferences(result.rows[0]);
}

export async function softDeleteProfile(
  client: PoolClient,
  userId: string,
  tenantId: string,
): Promise<Profile | null> {
  const result = await client.query<ProfileRow>(
    `
      UPDATE ${profilesTable}
      SET display_name = NULL,
          language = NULL,
          timezone = NULL,
          deleted_at = now(),
          updated_at = now(),
          version = version + 1
      WHERE tenant_id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING id,
                user_id AS "userId",
                tenant_id AS "tenantId",
                display_name AS "displayName",
                language,
                timezone,
                deleted_at AS "deletedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt",
                version
    `,
    [tenantId, userId],
  );

  const row = result.rows[0];
  return row ? toProfile(row) : null;
}

export async function insertProfileEvent(
  client: PoolClient,
  opts: {
    tenantId: string;
    userId: string;
    action: string;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
  },
): Promise<void> {
  await client.query(
    `
      INSERT INTO ${profileEventsTable} (tenant_id, user_id, action, payload, idempotency_key)
      VALUES ($1, $2, $3, $4::jsonb, $5)
    `,
    [opts.tenantId, opts.userId, opts.action, JSON.stringify(opts.payload), opts.idempotencyKey ?? null],
  );
}

export async function insertOutboxEvent(
  client: PoolClient,
  opts: {
    tenantId: string;
    userId: string;
    eventType: string;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
  },
): Promise<void> {
  await client.query(
    `
      INSERT INTO ${outboxEventsTable} (tenant_id, user_id, event_type, payload, idempotency_key)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      ON CONFLICT (tenant_id, event_type, idempotency_key)
      WHERE idempotency_key IS NOT NULL
      DO NOTHING
    `,
    [opts.tenantId, opts.userId, opts.eventType, JSON.stringify(opts.payload), opts.idempotencyKey ?? null],
  );
}
