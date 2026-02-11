import { closeDb } from "../libs/db";

async function main(): Promise<void> {
  // Intentional no-op seed to keep the target available in CI/Makefile.
  // Real seed data should be environment-specific.
  // eslint-disable-next-line no-console
  console.info("[seed] no-op");
  await closeDb();
}

void main();
