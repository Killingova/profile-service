import { Pool, type PoolClient } from "pg";
import { env } from "./env";

const IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/i;

function quoteIdentifier(value: string): string {
  if (!IDENTIFIER_RE.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  return `"${value.replace(/"/g, '""')}"`;
}

const pool = env.DATABASE_URL
  ? new Pool({ connectionString: env.DATABASE_URL })
  : new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    });

const schemaQuoted = quoteIdentifier(env.DB_SCHEMA);
const roleQuoted = quoteIdentifier(env.DB_ROLE);

export type DbTenantContext = {
  tenantId: string;
  userId?: string;
};

export function schemaTable(tableName: string): string {
  return `${schemaQuoted}.${quoteIdentifier(tableName)}`;
}

export function getPool(): Pool {
  return pool;
}

export async function closeDb(): Promise<void> {
  await pool.end();
}

export async function dbHealth(): Promise<{ ok: boolean }> {
  try {
    await pool.query("select 1");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function withTenantTx<T>(
  context: DbTenantContext,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL ROLE ${roleQuoted}`);
    await client.query(`SET LOCAL search_path TO ${schemaQuoted}, meta, public`);
    await client.query(`SELECT set_config('app.tenant', $1, true)`, [context.tenantId]);
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [context.userId ?? ""]);

    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }

    throw error;
  } finally {
    client.release();
  }
}
