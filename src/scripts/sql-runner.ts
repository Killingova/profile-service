import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getPool } from "../libs/db";

export async function runSqlDirectory(relativeDir: string): Promise<void> {
  const pool = getPool();
  const directory = join(process.cwd(), relativeDir);

  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const client = await pool.connect();
  try {
    for (const file of files) {
      const path = join(directory, file);
      const sql = readFileSync(path, "utf8");
      if (sql.trim().length === 0) {
        continue;
      }

      // eslint-disable-next-line no-console
      console.info(`[sql-runner] executing ${relativeDir}/${file}`);
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}
