import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { env, type AuthzMode } from "../libs/env";
import { AppError } from "../libs/errors";
import { assertUuid, parseSingleHeader } from "../libs/headers";
import { extractBearerToken, verifyAccessToken } from "../libs/jwt";

type AuthzPluginOptions = {
  mode?: AuthzMode;
};

function authContextError(message: string): AppError {
  return new AppError(400, "AUTH_CONTEXT_INVALID", message);
}

const authzPlugin: FastifyPluginAsync<AuthzPluginOptions> = async (app, opts) => {
  const mode = opts.mode ?? env.AUTHZ_MODE;

  app.addHook("preHandler", async (request) => {
    const routeConfig = request.routeOptions.config ?? {};
    if (!routeConfig.authzRequired) {
      return;
    }

    const authorization = parseSingleHeader(request, "authorization");
    const userHeaderRaw = parseSingleHeader(request, env.USER_HEADER);

    if (mode === "gateway_headers") {
      if (authorization) {
        throw authContextError("Authorization header is not allowed in gateway_headers mode.");
      }

      if (!userHeaderRaw) {
        throw new AppError(401, "MISSING_AUTH", `Missing ${env.USER_HEADER} header.`);
      }

      const userId = assertUuid(userHeaderRaw, env.USER_HEADER, "AUTH_CONTEXT_INVALID");
      request.userId = userId;
      return;
    }

    if (userHeaderRaw) {
      throw authContextError(`${env.USER_HEADER} is not allowed in service_jwt mode.`);
    }

    const token = extractBearerToken(authorization);
    const claims = verifyAccessToken(token);

    const userId = assertUuid(claims.sub, "sub", "INVALID_AUTH");
    request.userId = userId;
    request.authClaims = claims;

    const tokenTenant = typeof claims.tid === "string"
      ? claims.tid
      : typeof claims.tenant_id === "string"
        ? claims.tenant_id
        : undefined;

    if (!tokenTenant) {
      throw new AppError(401, "INVALID_AUTH", "Tenant claim is missing in access token.");
    }

    const tokenTenantUuid = assertUuid(tokenTenant, "tid", "INVALID_AUTH");
    if (!request.tenantId || request.tenantId !== tokenTenantUuid) {
      throw new AppError(403, "TENANT_MISMATCH", "Tenant mismatch between token and header.");
    }
  });
};

export default fp(authzPlugin, {
  name: "authz",
});
