import type { FastifyPluginAsync } from "fastify";
import { dbHealth } from "../../libs/db";

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health/live",
    {
      config: {
        tenantRequired: false,
        authzRequired: false,
      },
    },
    async () => ({
      status: "alive",
      service: "profile-service",
      ts: new Date().toISOString(),
    }),
  );

  app.get(
    "/health/db",
    {
      config: {
        tenantRequired: false,
        authzRequired: false,
      },
    },
    async (_request, reply) => {
      const db = await dbHealth();
      if (!db.ok) {
        return reply.status(503).send({ status: "down", db: "down" });
      }

      return { status: "ok", db: "ok" };
    },
  );

  app.get(
    "/health/ready",
    {
      config: {
        tenantRequired: false,
        authzRequired: false,
      },
    },
    async (_request, reply) => {
      const db = await dbHealth();

      if (!db.ok) {
        return reply.status(503).send({
          status: "not_ready",
          checks: {
            db: "down",
          },
        });
      }

      return {
        status: "ready",
        checks: {
          db: "ok",
        },
      };
    },
  );

  app.get(
    "/health",
    {
      config: {
        tenantRequired: false,
        authzRequired: false,
      },
    },
    async (_request, reply) => {
      const db = await dbHealth();
      const status = db.ok ? "ok" : "degraded";

      if (!db.ok) {
        reply.status(503);
      }

      return {
        status,
        service: "profile-service",
        checks: {
          db: db.ok ? "ok" : "down",
        },
      };
    },
  );

  app.get(
    "/profiles/health",
    {
      config: {
        tenantRequired: false,
        authzRequired: false,
      },
    },
    async () => ({
      status: "ok",
      service: "profile-service",
      ts: new Date().toISOString(),
    }),
  );
};

export default healthRoutes;
