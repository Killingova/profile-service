import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../libs/env";
import { errorResponse } from "../libs/errors";

const openApiPlugin: FastifyPluginAsync = async (app) => {
  app.get(
    "/openapi.json",
    {
      config: {
        tenantRequired: false,
        authzRequired: false,
      },
    },
    async (request, reply) => {
      if (!env.OPENAPI_ENABLED) {
        return reply
          .status(404)
          .send(errorResponse(404, "NOT_FOUND", "Not found.", request.requestId));
      }

      return {
        openapi: "3.0.3",
        info: {
          title: "Profile Service API",
          version: "1.0.0",
        },
        components: {
          schemas: {
            ErrorResponse: {
              type: "object",
              required: ["status", "error"],
              properties: {
                status: { type: "integer" },
                request_id: { type: "string" },
                error: {
                  type: "object",
                  required: ["code", "message"],
                  properties: {
                    code: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
        paths: {
          "/profiles/me": {
            get: { summary: "Get current profile" },
            patch: { summary: "Update current profile" },
            delete: { summary: "Delete/anonymize current profile" },
          },
          "/profiles/me/preferences": {
            get: { summary: "Get current profile preferences" },
            put: { summary: "Replace current profile preferences" },
          },
          "/health/live": { get: { summary: "Liveness" } },
          "/health/ready": { get: { summary: "Readiness" } },
          "/health/db": { get: { summary: "Database health" } },
          "/metrics": { get: { summary: "Prometheus metrics" } },
        },
      };
    },
  );
};

export default fp(openApiPlugin, {
  name: "openapi",
});
