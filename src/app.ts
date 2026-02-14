import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { env, type AuthzMode } from "./libs/env";
import { asAppError, errorResponse, AppError } from "./libs/errors";
import authzPlugin from "./plugins/authz";
import metricsPlugin from "./plugins/metrics";
import openApiPlugin from "./plugins/openapi";
import requestContextPlugin from "./plugins/request-context";
import tenantGuardPlugin from "./plugins/tenant-guard";
import healthRoutes from "./modules/health/routes";
import profileRoutes from "./modules/profile/routes";
import readingsRoutes from "./modules/readings/routes";

export type BuildAppOptions = {
  authzMode?: AuthzMode;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers['set-cookie']",
        ],
        censor: "[REDACTED]",
      },
    },
  });

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(errorResponse(400, "VALIDATION_FAILED", "Invalid request payload.", request.requestId));
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "validation" in error &&
      (error as { validation?: unknown }).validation
    ) {
      return reply
        .status(400)
        .send(errorResponse(400, "VALIDATION_FAILED", "Invalid request payload.", request.requestId));
    }

    const appError = asAppError(error);
    request.log.error(
      {
        err: error,
        request_id: request.requestId,
        tenant_id: request.tenantId,
        user_id: request.userId,
        error_code: appError.code,
        status_code: appError.statusCode,
      },
      appError.message,
    );

    return reply
      .status(appError.statusCode)
      .send(errorResponse(appError.statusCode, appError.code, appError.message, request.requestId));
  });

  app.setNotFoundHandler(async (request, reply) => {
    return reply
      .status(404)
      .send(errorResponse(404, "NOT_FOUND", "Route not found.", request.requestId));
  });

  app.register(requestContextPlugin);
  app.register(tenantGuardPlugin);
  app.register(authzPlugin, {
    mode: options.authzMode,
  });
  app.register(metricsPlugin);
  app.register(openApiPlugin);

  app.register(healthRoutes);
  app.register(profileRoutes);
  app.register(readingsRoutes);

  app.addHook("preHandler", async (request) => {
    const routeConfig = request.routeOptions.config ?? {};

    if (routeConfig.authzRequired && !request.userId) {
      throw new AppError(401, "MISSING_AUTH", "Authentication context is missing.");
    }
  });

  return app;
}
