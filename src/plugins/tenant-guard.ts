import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { AppError } from "../libs/errors";

const tenantGuardPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request) => {
    const routeConfig = request.routeOptions.config ?? {};
    if (!routeConfig.tenantRequired) {
      return;
    }

    if (!request.tenantId) {
      throw new AppError(400, "VALIDATION_FAILED", "Missing tenant header.");
    }
  });
};

export default fp(tenantGuardPlugin, {
  name: "tenant-guard",
});
