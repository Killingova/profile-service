import { closeDb } from "../libs/db";
import { runSqlDirectory } from "./sql-runner";

async function main(): Promise<void> {
  try {
    await runSqlDirectory("sql/init");
    await runSqlDirectory("sql/migrations");
    // eslint-disable-next-line no-console
    console.info("[migrate] done");
  } finally {
    await closeDb();
  }
}

void main();
