import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../libs/env";
import { AppError } from "../libs/errors";
import { assertUuid, parseSingleHeader } from "../libs/headers";

const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

const requestContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const requestIdHeader = parseSingleHeader(request, env.REQUEST_ID_HEADER);
    const requestId = requestIdHeader && REQUEST_ID_RE.test(requestIdHeader)
      ? requestIdHeader
      : randomUUID();

    request.requestId = requestId;
    reply.header("x-request-id", requestId);

    const tenantHeader = parseSingleHeader(request, env.TENANT_HEADER);
    if (tenantHeader !== undefined) {
      request.tenantId = assertUuid(tenantHeader, env.TENANT_HEADER, "VALIDATION_FAILED");
    }

    request.log = request.log.child({
      request_id: requestId,
      tenant_id: request.tenantId,
    });
  });

  app.addHook("preHandler", async (request) => {
    const tenantHeader = request.headers[env.TENANT_HEADER];
    if (Array.isArray(tenantHeader)) {
      throw new AppError(400, "VALIDATION_FAILED", `${env.TENANT_HEADER} must be a single value.`);
    }
  });
};

export default fp(requestContextPlugin, {
  name: "request-context",
});
