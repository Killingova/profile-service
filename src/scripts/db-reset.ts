import { getPool, closeDb } from "../libs/db";
import { env } from "../libs/env";
import { runSqlDirectory } from "./sql-runner";

async function main(): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("db-reset is blocked in production.");
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("DROP SCHEMA IF EXISTS profile CASCADE");
  } finally {
    client.release();
  }

  try {
    await runSqlDirectory("sql/init");
    // eslint-disable-next-line no-console
    console.info("[db-reset] done");
  } finally {
    await closeDb();
  }
}

void main();
