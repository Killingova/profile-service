import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../libs/env";
import { renderPrometheusMetrics, recordHttpRequest } from "../libs/metrics";
import { errorResponse } from "../libs/errors";

const metricsPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request) => {
    request.metricStartMs = Date.now();
  });

  app.addHook("onResponse", async (request, reply) => {
    const start = request.metricStartMs ?? Date.now();
    const durationMs = Date.now() - start;
    const route = request.routeOptions.url ?? request.url.split("?")[0] ?? "unknown";
    recordHttpRequest(request.method, route, reply.statusCode, durationMs);
  });

  app.get(
    "/metrics",
    {
      config: {
        tenantRequired: false,
        authzRequired: false,
      },
    },
    async (request, reply) => {
      if (!env.METRICS_ENABLED) {
        return reply
          .status(404)
          .send(errorResponse(404, "NOT_FOUND", "Not found.", request.requestId));
      }

      reply.type("text/plain; version=0.0.4; charset=utf-8");
      return reply.send(renderPrometheusMetrics());
    },
  );
};

export default fp(metricsPlugin, {
  name: "metrics",
});
