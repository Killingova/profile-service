import { buildApp } from "./app";
import { closeDb } from "./libs/db";
import { env, logEnvSummary } from "./libs/env";

async function main(): Promise<void> {
  const app = buildApp();

  logEnvSummary((message, meta) => app.log.info(meta, message));

  app.addHook("onClose", async () => {
    await closeDb();
  });

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });
  } catch (error) {
    app.log.error({ error }, "Failed to start profile-service");
    process.exit(1);
  }
}

void main();
